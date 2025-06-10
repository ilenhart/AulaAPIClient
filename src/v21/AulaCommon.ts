


//Most responses are just a data object, with a status object
export abstract class AulaJsonResponseDataWrapper<T> {
    status : {
        code : number;
        message : string;
    };
    data : T;
    version : number;
    module : string;
    method : string;
}

//Some responses have the data (from above) as a special data object showing results that are paged. 
export abstract class AulaJsonPagedDataWrapper<T> {
    totalSize: number;
    size: number;
    from: number;
    query: string;
    results : T[];
    mediaResults: any;
}

//This combines the two above into a single inheritable class for any response that has paged results
export abstract class AulaJsonResponsePagedResults<T> extends AulaJsonResponseDataWrapper<AulaJsonPagedDataWrapper<T>> {

}

