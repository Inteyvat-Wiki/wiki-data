import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import type { MapRecord } from 'genshin-db';
import type { MapCoordinate, MapOverlay, MapRegion } from '@inteyvat-wiki/wiki-contracts/map';
import { get_output_root } from './output';

export interface MapPngSource { file: string; sha256: string }
export interface MapPixelImage { width: number; height: number; data: Uint8Array }
export function checked_map_image(source: MapPngSource): Buffer {
    if (!source || typeof source.file !== 'string' || !/^[a-f0-9]{64}$/.test(source.sha256)) throw new Error('Missing map image identity');
    const bytes=fs.readFileSync(source.file);
    if (createHash('sha256').update(bytes).digest('hex')!==source.sha256) throw new Error('Map image changed after snapshot preparation');
    return bytes;
}
function wrap(value:number,size:number) { return ((value%size)+size)%size; }
/** Bilinear repeat sampling, with PNG rows converted to bottom-origin texture UV. */
function sample_red(image:MapPixelImage,u:number,v:number):number {
    const x=u*image.width-.5,y=(1-v)*image.height-.5,x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
    const read=(col:number,row:number)=>image.data[(wrap(row,image.height)*image.width+wrap(col,image.width))*4]!/255;
    return (read(x0,y0)*(1-fx)+read(x0+1,y0)*fx)*(1-fy)+(read(x0,y0+1)*(1-fx)+read(x0+1,y0+1)*fx)*fy;
}
/** Display conversion of the upstream-verified red-channel mask formula at native resolution. */
export function compose_boundary_pixels(mask:MapPixelImage,noise:MapPixelImage,color:[number,number,number,number],scale:[number,number],offset:[number,number]):Buffer {
    for (const image of [mask,noise]) if (!Number.isSafeInteger(image.width) || image.width<1 || !Number.isSafeInteger(image.height) || image.height<1 || image.data.length!==image.width*image.height*4) throw new Error('Invalid boundary pixel image');
    if (![...color,...scale,...offset].every(Number.isFinite) || color.some(value=>value<0 || value>1)) throw new Error('Invalid boundary color or noise transform');
    const output=Buffer.alloc(mask.data.length), byte=(value:number)=>Math.round(Math.min(1,Math.max(0,value))*255);
    for(let row=0;row<mask.height;row++) for(let col=0;col<mask.width;col++) {
        const index=(row*mask.width+col)*4, red=mask.data[index]!/255*color[0];
        const n=sample_red(noise,(col+.5)/mask.width*scale[0]+offset[0],(1-(row+.5)/mask.height)*scale[1]+offset[1]);
        output[index]=byte(red+n);output[index+1]=byte(mask.data[index+1]!/255*color[1]);output[index+2]=byte(mask.data[index+2]!/255*color[2]);output[index+3]=byte(red*color[3]);
    }
    return output;
}
export function render_boundary_mask(mask:MapPngSource,noise:MapPngSource,color:[number,number,number,number],scale:[number,number],offset:[number,number],relative:string):string {
    const source=PNG.sync.read(checked_map_image(mask)), pattern=PNG.sync.read(checked_map_image(noise));
    const png=new PNG({width:source.width,height:source.height});
    png.data=compose_boundary_pixels(source,pattern,color,scale,offset);
    const root=path.resolve(get_output_root(),'images'), target=path.resolve(root,`${relative}.png`);
    if (!target.startsWith(root+path.sep) || /[<>:"|?*\x00-\x1f]/.test(relative)) throw new Error('Invalid generated map image path');
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,PNG.sync.write(png));
    return '/images/'+path.relative(root,target).split(path.sep).join('/');
}

/** Convert the one directory-selected native boundary; no runtime state or selector. */
export function convert_native_boundary(record:MapRecord, sceneId:string,
    copyImage:(source:string,target:string)=>string|null, renderMask = render_boundary_mask): { overlay:MapOverlay; region:MapRegion } {
    const data=record.data as Record<string,any>, mask=data.mask, rim=data.rim;
    if (record.kind!=='resource' || data.category!=='native-boundary' || data.status!=='static-serialized-state'
        || mask?.shader_profile!=='open-area-red-channel-v1' || mask.blend!=='normal'
        || rim?.coordinate_space!=='world-xz' || rim.uv_origin!=='bottom-left' || rim.blend!=='additive'
        || rim.texture_filter!=='bilinear' || rim.texture_wrap!=='clamp') throw new Error('Unsupported native boundary rendering');
    const vector=(value:unknown,length:number):number[]=>{
        if(!Array.isArray(value)||value.length!==length||!value.every(Number.isFinite)) throw new Error('Invalid native boundary vector');
        return [...value];
    };
    const point=(value:any):MapCoordinate=>{
        if(!value||!Number.isFinite(value.x)||!Number.isFinite(value.y)) throw new Error('Invalid native boundary point');
        return {x:value.x,y:value.y};
    };
    if(mask.display_geometry?.space!=='world-xz'||mask.display_geometry.corners?.length!==4) throw new Error('Missing native boundary projection');
    const corners=[3,2,1,0].map(index=>point(mask.display_geometry.corners[index])) as [MapCoordinate,MapCoordinate,MapCoordinate,MapCoordinate];
    const bounds:[MapCoordinate,MapCoordinate]=[
        {x:Math.min(...corners.map(p=>p.x)),y:Math.min(...corners.map(p=>p.y))},
        {x:Math.max(...corners.map(p=>p.x)),y:Math.max(...corners.map(p=>p.y))}];
    if(!Array.isArray(rim.vertices)||rim.vertices.length<3||!Array.isArray(rim.uv)||rim.uv.length!==rim.vertices.length
        ||!Array.isArray(rim.triangles)||!rim.triangles.length) throw new Error('Invalid native boundary mesh');
    const vertices=rim.vertices.map(point), triangles=rim.triangles.map((value:unknown)=>{
        const triangle=vector(value,3);
        if(!triangle.every(index=>Number.isSafeInteger(index)&&index>=0&&index<vertices.length)) throw new Error('Invalid native boundary triangle');
        return triangle as [number,number,number];
    });
    const uv=rim.uv.map((value:unknown)=>{const [u,v]=vector(value,2);return [u!,1-v!] as [number,number];});
    const color=vector(rim.color,3) as [number,number,number];
    if(color.some(c=>c<0||c>1)||!Number.isFinite(rim.opacity)||rim.opacity<0||rim.opacity>1) throw new Error('Invalid native boundary tint');
    checked_map_image({file:rim.image_file,sha256:rim.image_sha256});
    const texture=copyImage(rim.image_file,`map/scenes/${sceneId}/${record.id}-rim`);
    if(!texture) throw new Error(`Native boundary texture could not be copied: ${record.id}`);
    const image=renderMask({file:mask.image_file,sha256:mask.image_sha256},{file:mask.noise_image_file,sha256:mask.noise_image_sha256},
        vector(mask.component_color,4) as [number,number,number,number],vector(mask.noise_scale,2) as [number,number],
        vector(mask.noise_offset,2) as [number,number],`map/scenes/${sceneId}/${record.id}-mask`);
    return {
        overlay:{id:`${record.id}-mask`,image,label:'',bounds,corners,zIndex:100000,kind:'boundary',evidence:'native',blend:'normal'},
        region:{id:`${record.id}-rim`,label:'',description:'',rings:[],kind:'playable-boundary',evidence:'native',
            mesh:{vertices,triangles,uv,texture,color,opacity:rim.opacity,blend:'additive',zIndex:100001}},
    };
}
