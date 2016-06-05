declare module 'kefir' {
  declare class Emmitter<T> {
    emit(value: T): void;
    error(error: Error): void;
    end(): void;
  }

  declare class Stream<T> {
    filter(predicate: (val: T) => bool): Stream<T>;
    take(n: number): Stream<T>;
    scan<N>(fn: (prev: N, next: T) => N, seed?: N): Stream<N>;
    last(): Stream<T>;
    map<N>(fn: (val: T) => N): Stream<N>;
    flatMapConcat<N>(spawn: (val: T) => Stream<N>): Stream<N>;
    toPromise(): Promise<T>;
  }

  declare class Property<T> extends Stream<T> {

  }

  declare type Observable<T> = Stream<T> | Property<T>;

  declare function stream<T>(subscribe: (emmiter: Emmitter<T>) => void | () => void): Stream<T>;
  declare function merge<T>(obss: Array<Observable>): Stream<T>;
  declare function concat<T>(obss: Array<Observable>): Stream<T>;
  declare function constant<T>(val: T): Property<T>;
  declare function fromPromise<T>(promise: Promise<T>): Property<T>;
}