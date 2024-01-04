export default class FunctionMetadata {
    functionName: string;

    constructor(functionMetadataFile: string) {
        // const functionRawMetadata = JSON.parse(readFileSync(functionMetadataFile, 'utf8'));

        // eslint-disable-next-line prefer-destructuring
        this.functionName = functionMetadataFile.split('/')
            .reverse()[0].split('.')[0];
    }
}
