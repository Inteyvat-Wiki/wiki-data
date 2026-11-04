import type { MapCoordinate, MapScene } from '@inteyvat-wiki/wiki-contracts/map';

/** Directory membership is curated; placement and condition links are derived from converted data. */
export function add_map_mask_groups(scene: MapScene, directory: Record<string, string[]>, lang: 'zh_hans' | 'en') {
    const conditions = scene.maskConditions || [], expected = new Set(conditions.flatMap(group => group.overlayIds));
    const overlays = new Map(scene.overlays.map(overlay => [overlay.id, overlay])), assigned = new Set<string>();
    scene.maskGroups = Object.entries(directory).map(([id, members], index) => {
        if (!members.length) throw new Error(`Empty mask group: ${scene.id}/${id}`);
        const centers: MapCoordinate[] = members.map(member => {
            if (!expected.has(member) || assigned.has(member)) throw new Error(`Missing, non-mask or duplicate mask group member: ${scene.id}/${member}`);
            assigned.add(member);
            const overlay = overlays.get(member);
            if (!overlay) throw new Error(`Mask group image was not exported: ${scene.id}/${member}`);
            const points = overlay.corners || overlay.bounds;
            return { x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
                y: points.reduce((sum, point) => sum + point.y, 0) / points.length };
        });
        const position = { x: centers.reduce((sum, point) => sum + point.x, 0) / centers.length,
            y: centers.reduce((sum, point) => sum + point.y, 0) / centers.length };
        if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) throw new Error(`Invalid mask group center: ${scene.id}/${id}`);
        return { id, label: lang === 'zh_hans' ? `遮罩组 ${index + 1}` : `Mask group ${index + 1}`, position,
            overlayIds: [...members], conditionIds: conditions.filter(group => group.overlayIds.some(member => members.includes(member))).map(group => group.id) };
    });
    const missing = [...expected].filter(id => !assigned.has(id));
    if (missing.length) throw new Error(`Masks require explicit directory grouping: ${scene.id}/${missing.join(', ')}`);
}
