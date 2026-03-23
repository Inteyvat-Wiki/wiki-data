export type LivingBeing = {
    name: string,
    icon: string,
    type: string,
    info: {
        title: string,
        description: string,
    }[],
    description_full: string | null,
}[];