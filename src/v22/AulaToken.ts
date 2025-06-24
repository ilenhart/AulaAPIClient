import { AulaJsonResponseDataWrapper } from "./AulaCommon";


class AulaTokenResponse extends AulaJsonResponseDataWrapper<string> {
}


export class AulaTokenSerializer {

    static fromJSON(responseJson: string): string {
        const response = JSON.parse(responseJson);
        const responseObj =  Object.assign(new AulaTokenResponse (), response);
        return responseObj.data;
    }

}
