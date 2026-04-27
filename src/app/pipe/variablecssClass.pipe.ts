import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'variableCssClass'
})
export class VariableCssClassPipe implements PipeTransform {

  transform(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    const matches = value.match(/^{{.*?}}$/);
    return matches ? 'set-attribute-value' : '';
  }

}
