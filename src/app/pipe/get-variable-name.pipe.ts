import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'getVariableName'
})
export class GetVariableNamePipe implements PipeTransform {

  transform(value: string): string {
    // let matches = value.match(new RegExp(/{{[^{}]*}}/g));
    console.log('texxxxxx', value)
    // if (!matches || matches.length == 0) {
    //   console.log('regexxxx', matches)
    //   return value;
    // } 
    return value;
  }

}
