export function getPaginationParams(pageInput?: number, pageSizeInput?: number) {
    const page = pageInput ?? 1;
    let pageSize = pageSizeInput ?? 10;
    let warnings: string[] | undefined;

    if (pageSize > 200) {
        pageSize = 200;
        warnings = ['The maximum supported pageSize is 200.'];
    }

    return { page, pageSize, warnings };
}
