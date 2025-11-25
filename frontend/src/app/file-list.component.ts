import { Component, NgZone, ChangeDetectorRef, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { map } from 'rxjs/operators';
import { ScrollingModule } from '@angular/cdk/scrolling';

interface FileEntry {
  name: string;
  path: string;
  size: number | null;
  isDirectory: boolean;
  created: number;
  modified?: number;
  extension?: string | null;
  type: 'file' | 'directory';
}

type SortKey = 'name' | 'size' | 'created';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-file-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ScrollingModule],
  templateUrl: './file-list.component.html',
  styleUrls: ['./file-list.component.scss'],
})
export class FileListComponent implements OnDestroy {
  getFileIcon(file: FileEntry): string {
    if (file.isDirectory) {
      return 'bi-folder-fill';
    }

    const extension = file.extension?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
        return 'bi-file-image';
      case 'pdf':
        return 'bi-file-pdf';
      case 'doc':
      case 'docx':
        return 'bi-file-earmark-word';
      case 'xls':
      case 'xlsx':
        return 'bi-file-earmark-excel';
      case 'ppt':
      case 'pptx':
        return 'bi-file-earmark-ppt';
      case 'zip':
      case 'rar':
      case '7z':
        return 'bi-file-earmark-zip';
      case 'txt':
        return 'bi-file-earmark-text';
      case 'js':
      case 'ts':
      case 'html':
      case 'css':
      case 'json':
      case 'xml':
        return 'bi-file-earmark-code';
      default:
        return 'bi-file-earmark';
    }
  }

  files = signal<FileEntry[]>([]);
  loading = signal(true);
  loadedCount = signal(0);
  currentPath = signal('');
  selectedFile = signal<FileEntry | null>(null);
  fileCount = signal(0);
  directoryCount = signal(0);

  sortKey = signal<SortKey>('name');
  sortDirection = signal<SortDirection>('asc');

  sortedFiles = computed(() => {
    const currentFiles = this.files();
    const key = this.sortKey();
    const direction = this.sortDirection();

    if (!currentFiles || currentFiles.length === 0) {
      return [];
    }

    return [...currentFiles].sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      let compareValue = 0;
      switch (key) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'size':
          const sizeA = a.size === null ? (a.isDirectory ? -1 : Infinity) : a.size;
          const sizeB = b.size === null ? (b.isDirectory ? -1 : Infinity) : b.size;
          compareValue = sizeA - sizeB;
          break;
        case 'created':
          compareValue = a.created - b.created;
          break;
      }
      return direction === 'asc' ? compareValue : -compareValue;
    });
  });

  get breadcrumb(): string[] {
    return this.currentPath().split('/').filter(Boolean);
  }

  // private cache = new Map<string, FileEntry[]>();
  private activeLoad: Promise<void> | null = null;
  private abortController: AbortController | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.route.queryParamMap.pipe(map((params) => params.get('path') ?? '')).subscribe((path) => {
      this.currentPath.set(path);
      this.loadFiles(path);
    });
  }

  ngOnDestroy(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private async loadFiles(path: string): Promise<void> {
    console.log('🔍 loadFiles called with path:', path);

    if (this.activeLoad) {
      await this.activeLoad;
      // if (this.cache.has(path)) {
      //   this.files.set(this.cache.get(path)!);
      //   this.loadedCount.set(this.files().length);
      //   this.loading.set(false);
      //   return;
      // }
    }

    const loadPromise = (async () => {
      // Abort older requests
      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();

      // if (this.cache.has(path)) {
      //   const cachedFiles = this.cache.get(path)!;
      //   this.files.set(cachedFiles);
      //   this.loadedCount.set(cachedFiles.length);
      //   this.loading.set(false);
      // } else {
      // console.log('No cache hit for:', path);
      this.loading.set(true);
      this.files.set([]);
      this.loadedCount.set(0);
      this.fileCount.set(0);
      this.directoryCount.set(0);
      // }

      this.ngZone.runOutsideAngular(async () => {
        try {
          const url = `http://localhost:4000/api/files${
            path ? '?path=' + encodeURIComponent(path) : ''
          }`;
          console.log('Fetching data:', url, 'with signal:', this.abortController!.signal);
          const response = await fetch(url, { signal: this.abortController!.signal });
          if (!response.body) throw new Error('No body');

          const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
          const batch: FileEntry[] = [];
          const BATCH_SIZE = 5000;

          let totalProcessed = 0;
          let partialLineBuffer = ''; // Buffer for incomplete lines

          const newFilesAccumulator: FileEntry[] = [];

          console.log('Starting stream processing...');
          while (true) {
            const { done, value } = await reader.read();
            let chunk = partialLineBuffer + (value || '');

            if (done && !chunk) {
              // Stream done; no more chunkies
              break;
            }

            const lines = chunk.split('\n');
            partialLineBuffer = lines.pop() || ''; // IF Last element is partial, store it

            for (const line of lines) {
              if (!line.trim()) continue;

              try {
                const file = JSON.parse(line) as FileEntry;
                batch.push(file);
                totalProcessed++;
                if (file.isDirectory) {
                  this.directoryCount.update((count) => count + 1);
                } else {
                  this.fileCount.update((count) => count + 1);
                }

                if (batch.length >= BATCH_SIZE) {
                  newFilesAccumulator.push(...batch);
                  this.ngZone.run(() => {
                    this.files.set([...newFilesAccumulator]);
                    this.loadedCount.set(newFilesAccumulator.length);
                  });
                  batch.length = 0;
                }
              } catch (parseError) {
                console.warn('Failed to parse line from new data stream:', line, parseError);
              }
            }
          }

          if (batch.length > 0) {
            newFilesAccumulator.push(...batch);
            this.ngZone.run(() => {
              this.files.set([...newFilesAccumulator]);
              this.loadedCount.set(newFilesAccumulator.length);
            });
          }

          console.log(`Total files processed: ${totalProcessed}`);
          this.ngZone.run(() => {
            this.loading.set(false);
            // this.cache.set(path, [...newFilesAccumulator]);
            console.log('Loading complete');
          });
        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.log('Fetch aborted for path:', path, err);
          } else {
            console.error('Fresh load failed:', err);
          }
          this.ngZone.run(() => {
            this.loading.set(false);
            console.log('Fresh load failed or aborted');
          });
        } finally {
          // A bit of cleanups
          if (this.abortController) {
            this.abortController = null;
          }
        }
      });
    })();

    this.activeLoad = loadPromise;
    await loadPromise;
    this.activeLoad = null;
  }

  toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
    }
  }

  navigate(path: string): void {
    const normalized = path === '' ? null : '/' + path.replace(/^\/+|\/+$/g, '');
    this.router.navigate([], {
      queryParams: { path: normalized },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  navigateToIndex(index: number): void {
    const parts = this.breadcrumb.slice(0, index + 1);
    const newPath = parts.length === 0 ? '' : '/' + parts.join('/');
    this.navigate(newPath);
  }

  showDetails(file: FileEntry): void {
    this.selectedFile.set(file);
  }

  closeDetails(): void {
    this.selectedFile.set(null);
  }
}
