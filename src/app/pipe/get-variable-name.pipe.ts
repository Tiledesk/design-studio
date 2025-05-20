import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'getVariableName'
})
export class GetVariableNamePipe implements PipeTransform {

  transform(value: string): string {
    let matches = value?.match(new RegExp(/^{{.*?}}$/g));
    if (!matches || matches.length == 0) {
      return value;
    }
    return matches[0].slice(2, matches[0].length - 2);
  }

}
