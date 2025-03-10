import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'variableCssClass' 
})
export class VariableCssClassPipe implements PipeTransform {

  transform(value: string): string {
    let matches = value.match(new RegExp(/^{{.*?}}$/g));
    if (!matches || matches.length == 0) {
      return '';
    }
    return 'set-attribute-value';
  }

}
