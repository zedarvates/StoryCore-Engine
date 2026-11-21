import { debounce, debounceWithImmediate, throttle } from '../../src/utils/debounceAndThrottle';

// Compile-only checks: scheduling keeps the callback's exact argument tuple,
// accepts concrete parameter types and continues to return void.
const search = debounce((query: string, page: number) => query.length + page, 300);
const searchResult: void = search('scene', 2);
void searchResult;
// @ts-expect-error Pages retain the callback's numeric type.
search('scene', '2');
// @ts-expect-error Required callback arguments are not discarded.
search('scene');

const immediate = debounceWithImmediate((enabled: boolean, name: string) => ({ enabled, name }), 100, true);
immediate(true, 'preview');
// @ts-expect-error The first argument retains its boolean type.
immediate('true', 'preview');

const move = throttle((id: string, offset: number) => offset, 16);
move('shot-1', 10);
// @ts-expect-error Reordered callback argument types are rejected.
move(10, 'shot-1');
