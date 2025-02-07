import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { INTENT_COLORS } from 'src/app/chatbot-design-studio/utils';

@Component({
  selector: 'cds-color-menu',
  templateUrl: './cds-color-menu.component.html',
  styleUrls: ['./cds-color-menu.component.scss']
})

export class CdsColorMenuComponent implements OnInit {
  @Input() intentId: string;
  @Input() positions: any;
  @Output() hideColortMenu = new EventEmitter(); 

  colorKeys = Object.keys(INTENT_COLORS);
  colorValues = Object.values(INTENT_COLORS);

  hue: number = 0;
  selectedColor: string;


  constructor(
    private readonly intentService: IntentService
  ) { }

  ngOnInit(): void {
    //empty
  }


  /**
   * Function called when the slider is moved.
   * @param event
   */
  onSliderChange(event: Event): void {
    this.updateColor();
  }


  /** updateColor */
  updateColor(): void {
    const saturation = 100;
    const lightness = 35;
    this.selectedColor = this.hslToRgb(this.hue, saturation, lightness);
    this.intentService.setIntentColor(this.selectedColor);
  }

  /**
   * Convert HSL to RGB string.
   * @param h Hue (0-360)
   * @param s Saturation (0-100)
   * @param l Lightness (0-100)
   * @returns Stringa RGB
   */
  hslToRgb(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hh = h / 60;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (0 <= hh && hh < 1) {
      r = c; g = x; b = 0;
    } else if (1 <= hh && hh < 2) {
      r = x; g = c; b = 0;
    } else if (2 <= hh && hh < 3) {
      r = 0; g = c; b = x;
    } else if (3 <= hh && hh < 4) {
      r = 0; g = x; b = c;
    } else if (4 <= hh && hh < 5) {
      r = x; g = 0; b = c;
    } else if (5 <= hh && hh < 6) {
      r = c; g = 0; b = x;
    }
    const m = l - c / 2;
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    return `${r}, ${g}, ${b}`;
    /** return `rgb(${r}, ${g}, ${b})`; */
  }


  /**
   * onChangeColor
   * @param index 
   */
  onChangeColor(index: number){
    const color = this.colorValues[index];
    /** console.log("onChangeColor: ", color); */
    this.intentService.setIntentColor(color);
  }

}
