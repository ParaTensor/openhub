/** 与登录后「模型」页一致的排序：名称内版本号降序，再按名称长度、id。 */
export function sortByNameThenId<T extends {name: string; id: string}>(items: T[]) {
  return [...items].sort((a, b) => {
    const numA = parseFloat(a.name.match(/\d+(\.\d+)?/)?.[0] || '0');
    const numB = parseFloat(b.name.match(/\d+(\.\d+)?/)?.[0] || '0');
    if (numB !== numA) return numB - numA;
    if (a.name !== b.name) return a.name.length - b.name.length;
    return a.id.localeCompare(b.id);
  });
}
