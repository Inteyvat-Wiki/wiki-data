import type { PageDataTrait } from "~/types/common";

export type Readable = {
    name: string;
    content: string[];
};

export interface ReadablePage extends PageDataTrait {}

export type ReadablePages = ReadablePage[];
