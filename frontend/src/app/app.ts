import { Component, signal } from '@angular/core';
import { FileListComponent } from './file-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FileListComponent],
  template: `<app-file-list></app-file-list>`,
})
export class App {
  protected readonly title = signal('frontend');
}
