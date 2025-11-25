import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter([]), provideHttpClient(), importProvidersFrom(ScrollingModule)],
};
