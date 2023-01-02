interface DeferredPromise<T = void> {
    promise: Promise<T>;
    resolve: (value?: T | PromiseLike<T>) => Promise<T>;
    reject: (reason: any) => Promise<T>;
}

export function addDays(date: Date, days: number) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);

    return result;
}

export function defer<T = void>() {
    const deferred = <DeferredPromise<T>>{};
    deferred.promise = new Promise<T>((resolve, reject) => {
        deferred.resolve = value => {
            resolve(<T>value);

            return deferred.promise;
        };
        deferred.reject = (reason: any) => {
            reject(reason);
            return deferred.promise;
        };
    });

    return deferred;
}

export function delay<T = void>(duration?: number, result?: T) {
    return new Promise<T>((resolve, reject) => {
        setTimeout(() => resolve(<T>result), duration || 0);
    });
}