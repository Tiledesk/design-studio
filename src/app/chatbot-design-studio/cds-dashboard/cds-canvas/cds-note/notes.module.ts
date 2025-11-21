import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StageNotesComponent } from './stage-notes/stage-notes.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [StageNotesComponent],
  imports: [
    CommonModule, 
    FormsModule
  ],
  exports: [StageNotesComponent]
})
export class NotesModule {}
