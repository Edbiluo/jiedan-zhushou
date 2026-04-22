<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api';
import type { Book, Page, Schedule } from '@/types';
import Confetti from '@/components/Confetti.vue';
import draggable from 'vuedraggable';
import { useSettingsStore } from '@/stores/settings';
import { usePagesStore } from '@/stores/pages';
import dayjs from 'dayjs';
import { bookGradient } from '@/utils/palette';

const route = useRoute();
const router = useRouter();
const bookId = computed(() => Number(route.params.id));

const settings = useSettingsStore();
const pagesStore = usePagesStore();

const book = ref<Book | null>(null);
const schedules = ref<Schedule[]>([]);
const saving = ref(false);
const confettiTick = ref(0);

const bookPages = ref<Array<Page & { book_note?: string }>>([]);
const editingInfo = ref(false);

const edit = reactive({
  title: '',
  unit_price: 0,
  start_date: '',
  deadline: '',
  page_count: 0,
  size_id: null as number | null,
  style_id: null as number | null,
  sided: 'single' as 'single' | 'double',
  has_video: 0 as 0 | 1,
  note: '',
});
const editError = ref('');

async function refresh() {
  const [b, ss] = await Promise.all([
    api.books.get(bookId.value),
    api.schedules.byBook(bookId.value),
  ]);
  book.value = b;
  schedules.value = ss;
  if (b) {
    bookPages.value = (b.pages || []).map((p) => ({ ...p }));
    Object.assign(edit, {
      title: b.title,
      unit_price: b.unit_price,
      start_date: b.start_date || '',
      deadline: b.deadline,
      page_count: b.page_count || 0,
      size_id: b.size_id,
      style_id: b.style_id,
      sided: b.sided,
      has_video: b.has_video,
      note: b.note || '',
    });
  }
}

onMounted(async () => {
  if (!settings.loaded) await settings.load();
  await pagesStore.reload().catch(() => {});
  await refresh();
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && previewPage.value) {
      previewPage.value = null;
    }
  };
  window.addEventListener('keydown', handleEsc);
  return () => window.removeEventListener('keydown', handleEsc);
});
watch(() => bookId.value, refresh);

async function saveFields() {
  editError.value = '';
  if (!edit.title.trim()) { editError.value = '本名不能为空'; return; }
  if (!edit.start_date || !edit.deadline) { editError.value = '请填写日期'; return; }
  if (edit.deadline < edit.start_date) { editError.value = '完成日期不能早于开画日期'; return; }
  saving.value = true;
  try {
    await api.books.update(bookId.value, { ...edit });
    await refresh();
    editingInfo.value = false;
  } catch (e: any) {
    editError.value = e?.message || '保存失败';
  } finally { saving.value = false; }
}

// ============ 批量上传（支持拖拽 + 多选）============
const dragHover = ref(false);
const uploading = ref(false);
const uploadProgress = ref({ done: 0, total: 0 });

function filenameTitle(p: string) {
  const base = p.split(/[\\/]/).pop() || '未命名';
  return base.replace(/\.[^.]+$/, '');
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      // result = "data:image/xxx;base64,xxxxx"
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    r.onerror = () => reject(r.error || new Error('read fail'));
    r.readAsDataURL(file);
  });
}

function extFromFile(file: File) {
  const m = file.name.match(/\.[^.]+$/);
  if (m) return m[0].toLowerCase();
  if (file.type?.startsWith('image/')) return '.' + file.type.slice(6);
  return '.png';
}

// 用路径上传（系统对话框场景，文件不会消失）
async function uploadPaths(paths: string[]) {
  if (!paths.length) return;
  uploading.value = true;
  uploadProgress.value = { done: 0, total: paths.length };
  const newIds: number[] = [];
  try {
    for (const p of paths) {
      try {
        const page = await api.pages.create({
          src_path: p,
          title: filenameTitle(p),
        } as any);
        newIds.push(page.id);
      } catch (e) { console.error('upload fail for', p, e); }
      uploadProgress.value.done++;
    }
    if (newIds.length) await attachNewPages(newIds);
  } finally { uploading.value = false; }
}

// 用字节上传（拖拽场景，兼容微信/QQ 等会清理临时文件的来源）
async function uploadFiles(files: File[]) {
  if (!files.length) return;
  uploading.value = true;
  uploadProgress.value = { done: 0, total: files.length };
  const newIds: number[] = [];
  try {
    for (const file of files) {
      try {
        const base64 = await fileToBase64(file);
        const title = file.name.replace(/\.[^.]+$/, '') || '未命名';
        const page = await api.pages.create({
          title,
          content_base64: base64,
          ext: extFromFile(file),
        } as any);
        newIds.push(page.id);
      } catch (e) { console.error('upload fail for', file.name, e); }
      uploadProgress.value.done++;
    }
    if (newIds.length) await attachNewPages(newIds);
  } finally { uploading.value = false; }
}

async function attachNewPages(newIds: number[]) {
  const merged = [...bookPages.value.map((p) => p.id), ...newIds];
  await api.books.update(bookId.value, { page_ids: merged });
  await refresh();
  await pagesStore.reload();
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  dragHover.value = false;
  const files = Array.from(e.dataTransfer?.files || []);
  if (!files.length) return;
  // 拖拽一律走字节流（微信/QQ 等会立刻清理临时文件，路径不可靠）
  uploadFiles(files);
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  dragHover.value = true;
}
function onDragLeave() { dragHover.value = false; }

async function pickBatch() {
  const picker = (window as any).electronAPI?.pickImages;
  if (picker) {
    const paths = await picker();
    if (paths?.length) await uploadPaths(paths);
  } else {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files || []);
      if (files.length) uploadFiles(files);
    };
    input.click();
  }
}

// ============ 画页操作 ============
const showPagePicker = ref(false);
const pagePickerSelected = ref<Set<number>>(new Set());
const previewPage = ref<Page | null>(null);
const previewZoom = ref(1);

function openPicker() {
  pagePickerSelected.value = new Set();
  showPagePicker.value = true;
}

function resetPreviewZoom() {
  previewZoom.value = 1;
}

function handlePreviewWheel(e: WheelEvent) {
  if (!previewPage.value) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.1 : -0.1;
  previewZoom.value = Math.max(0.5, Math.min(3, previewZoom.value - delta));
}

function togglePick(p: Page) {
  if (pagePickerSelected.value.has(p.id)) pagePickerSelected.value.delete(p.id);
  else pagePickerSelected.value.add(p.id);
  pagePickerSelected.value = new Set(pagePickerSelected.value);
}
async function addPickedPages() {
  if (!pagePickerSelected.value.size) { showPagePicker.value = false; return; }
  const existing = new Set(bookPages.value.map((p) => p.id));
  const toAdd = Array.from(pagePickerSelected.value).filter((id) => !existing.has(id));
  const newIds = [...bookPages.value.map((p) => p.id), ...toAdd];
  await api.books.update(bookId.value, { page_ids: newIds });
  showPagePicker.value = false;
  await refresh();
}

async function onDragEnd() {
  const ids = bookPages.value.map((p) => p.id);
  await api.books.reorderPages(bookId.value, ids);
}

async function removePageFromBook(p: Page) {
  if (!confirm(`把「${p.title}」从本里移除？（画页本身保留在画页库）`)) return;
  const newIds = bookPages.value.filter((x) => x.id !== p.id).map((x) => x.id);
  await api.books.update(bookId.value, { page_ids: newIds });
  await refresh();
}

const noteSaveTimers = new Map<number, number>();
function scheduleNoteSave(p: Page & { book_note?: string }, v: string) {
  p.book_note = v;
  if (noteSaveTimers.has(p.id)) window.clearTimeout(noteSaveTimers.get(p.id)!);
  const t = window.setTimeout(async () => {
    await api.books.setPageNote(bookId.value, p.id, v);
  }, 500);
  noteSaveTimers.set(p.id, t);
}

// ============ 排期 ============
const byDate = computed(() => {
  const map: Record<string, Schedule[]> = {};
  for (const s of schedules.value) (map[s.date] ||= []).push(s);
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
});

async function toggleDone(s: Schedule) {
  await api.schedules.progress(s.id, { is_done: !s.is_done });
  await refresh();
  const allDone = schedules.value.length > 0 && schedules.value.every((x) => x.is_done);
  if (allDone) confettiTick.value++;
}

async function completeBook() {
  if (!confirm('确认标记整本完成？')) return;
  saving.value = true;
  try {
    await api.books.complete(bookId.value);
    confettiTick.value++;
    await refresh();
  } finally { saving.value = false; }
}

async function removeBook() {
  if (!confirm('删除整本？此操作不可撤销')) return;
  await api.books.remove(bookId.value);
  router.push('/books');
}

const headerGradient = computed(() =>
  book.value ? bookGradient(book.value.id, { light: 94, dark: 78, sat: 55 }) : ''
);

const styleName = computed(() => settings.styles.find((s) => s.id === book.value?.style_id)?.name);
const sizeName = computed(() => settings.sizes.find((s) => s.id === book.value?.size_id)?.name);
</script>

<template>
  <div v-if="book" class="space-y-3">
    <Confetti :trigger="confettiTick" />

    <!-- 顶部紧凑信息条 -->
    <div class="card !p-0 overflow-hidden">
      <div class="h-1.5" :style="{ background: headerGradient }"></div>
      <div class="px-5 py-3">
        <div class="flex items-center gap-3 flex-wrap">
          <h2 class="text-xl text-ink-900 min-w-0 truncate flex-1">{{ book.title }}</h2>
          <span class="chip-brand text-[11px]" v-if="book.status === 'in_progress'">进行中</span>
          <span class="chip-warn text-[11px]" v-else-if="book.status === 'near_deadline'">快到交付</span>
          <span class="chip-danger text-[11px]" v-else-if="book.status === 'overdue'">延期</span>
          <span class="chip-done text-[11px]" v-else-if="book.status === 'completed'">已完成</span>

          <button class="btn-ghost !py-1 !px-3 text-xs" @click="editingInfo = !editingInfo">
            {{ editingInfo ? '收起' : '✎ 编辑信息' }}
          </button>
          <button class="btn-primary !py-1 !px-3 text-xs"
                  :disabled="saving || book.status === 'completed'"
                  @click="completeBook">✓ 标记完成</button>
          <button class="btn-danger !py-1 !px-3 text-xs" @click="removeBook">删除</button>
        </div>

        <!-- 信息一行紧凑展示 -->
        <div class="mt-2 flex items-center gap-2 flex-wrap text-xs text-ink-500">
          <span class="chip">{{ book.start_date || '—' }} → {{ book.deadline }}</span>
          <span class="chip">{{ bookPages.length }} 页</span>
          <span class="chip">¥{{ book.unit_price }}</span>
          <span v-if="styleName" class="chip">{{ styleName }}</span>
          <span v-if="sizeName" class="chip">{{ sizeName }}</span>
          <span v-if="book.sided === 'double'" class="chip">双面</span>
          <span v-if="book.has_video" class="chip chip-brand">含视频</span>
          <span v-if="book.note" class="text-ink-700 ml-1 italic truncate">备注：{{ book.note }}</span>
        </div>
      </div>

      <!-- 展开式编辑区 -->
      <div v-if="editingInfo" class="px-5 pb-4 border-t border-cream-300/50 bg-cream-100/60">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
          <div class="col-span-2 md:col-span-2">
            <label class="text-xs text-ink-500">本名称</label>
            <input v-model="edit.title" class="input" />
          </div>
          <div>
            <label class="text-xs text-ink-500">单价 (¥)</label>
            <input v-model.number="edit.unit_price" type="number" min="0" class="input" />
          </div>
          <div>
            <label class="text-xs text-ink-500">页数</label>
            <input v-model.number="edit.page_count" type="number" min="0" class="input" />
          </div>
          <div>
            <label class="text-xs text-ink-500">开画日期</label>
            <input v-model="edit.start_date" type="date" class="input" />
          </div>
          <div>
            <label class="text-xs text-ink-500">完成日期</label>
            <input v-model="edit.deadline" type="date" class="input" />
          </div>
          <div>
            <label class="text-xs text-ink-500">款式</label>
            <select v-model="edit.style_id" class="input">
              <option :value="null">不选</option>
              <option v-for="s in settings.styles" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-ink-500">规格</label>
            <select v-model="edit.size_id" class="input">
              <option :value="null">不选</option>
              <option v-for="s in settings.sizes" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-ink-500">单/双面</label>
            <select v-model="edit.sided" class="input">
              <option value="single">单面</option>
              <option value="double">双面</option>
            </select>
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
              <input type="checkbox" :checked="!!edit.has_video"
                     @change="(e) => edit.has_video = (e.target as HTMLInputElement).checked ? 1 : 0" />
              含视频录制
            </label>
          </div>
          <div class="col-span-2 md:col-span-4">
            <label class="text-xs text-ink-500">备注</label>
            <textarea v-model="edit.note" rows="2" class="input" />
          </div>
        </div>
        <div v-if="editError" class="mt-2 text-sm text-[#D98B92]">{{ editError }}</div>
        <div class="flex justify-end mt-3 gap-2">
          <button class="btn-ghost" @click="editingInfo = false">取消</button>
          <button class="btn-primary" :disabled="saving" @click="saveFields">
            {{ saving ? '保存中…' : '保存修改' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 画页主区（大尺寸网格 + 拖拽上传）-->
    <div class="card !p-4">
      <div class="flex items-center gap-2 flex-wrap mb-3">
        <h3 class="text-lg text-brand-700">画页 <span class="text-sm text-ink-500">· {{ bookPages.length }}</span></h3>
        <div class="text-xs text-ink-500">可拖动排序 · 点击看大图 · 每页备注自动保存</div>
        <div class="ml-auto flex gap-2">
          <button class="btn-ghost text-sm" @click="openPicker">＋ 从画页库挑选</button>
          <button class="btn-primary text-sm" @click="pickBatch">＋ 批量上传</button>
        </div>
      </div>

      <!-- 拖拽区（始终显示，提示放图进来）-->
      <div
        class="border-2 border-dashed rounded-xl2 p-6 text-center mb-4 transition"
        :class="dragHover ? 'border-brand-500 bg-brand-50' : 'border-ink-100 bg-cream-100/60 hover:border-brand-300'"
        @drop="onDrop"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @click="pickBatch">
        <div v-if="uploading" class="text-sm text-brand-700">
          上传中… {{ uploadProgress.done }} / {{ uploadProgress.total }}
        </div>
        <template v-else>
          <div class="text-3xl mb-1">📥</div>
          <div class="text-sm text-ink-700">把图片拖到这里（支持从微信/QQ 直接拖）</div>
          <div class="text-xs text-ink-500 mt-0.5">或点击这里选择多张图片（上传即入画页库）</div>
        </template>
      </div>

      <div v-if="!bookPages.length" class="text-center py-6 text-ink-500 text-sm">
        还没有画页 ✿
      </div>

      <draggable v-else
                 v-model="bookPages" item-key="id" tag="div"
                 class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                 handle=".drag-handle" @end="onDragEnd">
        <template #item="{ element: p }">
          <div class="relative group bg-cream-50 rounded-xl2 shadow-soft p-2 flex flex-col">
            <div class="drag-handle absolute top-1 left-1 text-xs text-ink-300 bg-white/80 rounded px-1 cursor-move select-none z-10">⋮⋮</div>
            <button class="absolute top-1 right-1 text-xs bg-white/90 hover:bg-[#D98B92] hover:text-white rounded-full w-6 h-6 grid place-items-center shadow-soft opacity-0 group-hover:opacity-100 transition z-10"
                    title="从本里移除" @click.stop="removePageFromBook(p)">✕</button>
            <div class="aspect-[4/5] w-full bg-cream-200 rounded-lg overflow-hidden cursor-zoom-in grid place-items-center"
                 @click="previewPage = p">
              <img v-if="p.thumb_path" :src="`http://localhost:3899/images/${p.thumb_path}`"
                   class="w-full h-full object-cover" />
              <span v-else class="text-4xl opacity-40">🎨</span>
            </div>
            <div class="text-xs mt-2 truncate text-ink-700">
              <span v-if="p.is_cover" class="text-[#8A5E26] mr-1">【封】</span>{{ p.title }}
            </div>
            <textarea :value="p.book_note ?? ''"
                      @input="scheduleNoteSave(p, ($event.target as HTMLTextAreaElement).value)"
                      placeholder="本内备注…"
                      rows="2"
                      class="input !text-[11px] !px-2 !py-1 mt-1"></textarea>
          </div>
        </template>
      </draggable>
    </div>

    <!-- 排期预览 -->
    <div class="card">
      <h3 class="text-base text-brand-700 mb-2">排期</h3>
      <div v-if="!byDate.length" class="text-center py-4 text-ink-500 text-sm">还没有排期（先设日期）</div>
      <div v-else class="space-y-1.5">
        <div v-for="[date, items] in byDate" :key="date"
             class="flex items-center gap-3 border-l-4 border-brand-200 pl-3 py-1">
          <div class="text-sm text-brand-700 w-24 shrink-0">{{ date }}</div>
          <div class="flex-1 flex items-center gap-2 flex-wrap">
            <template v-for="it in items" :key="it.id">
              <label class="flex items-center gap-2 bg-cream-100 rounded-lg px-3 py-1 cursor-pointer text-sm">
                <input type="checkbox" :checked="!!it.is_done" @change="toggleDone(it)" />
                <span :class="it.is_done ? 'line-through text-ink-500' : ''">
                  <span v-if="it.segment_kind === 'video'">🎬 录视频</span>
                  <span v-else>画本</span>
                </span>
              </label>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 画页挑选弹窗 -->
    <Teleport to="body">
      <div v-if="showPagePicker" class="fixed inset-0 z-50 grid place-items-center">
        <div class="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" @click="showPagePicker = false" />
        <div class="relative card w-[780px] max-w-[95vw] max-h-[86vh] overflow-auto animate-pop">
          <h3 class="text-lg text-brand-700 mb-3">从画页库挑选</h3>
          <div class="text-xs text-ink-500 mb-3">已选 {{ pagePickerSelected.size }} 个</div>
          <div v-if="!pagesStore.list.length" class="text-center py-10 text-ink-500">画页库是空的</div>
          <div v-else class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            <div v-for="p in pagesStore.list" :key="p.id"
                 class="relative bg-white rounded-lg p-2 cursor-pointer transition"
                 :class="{ 'ring-2 ring-brand-400': pagePickerSelected.has(p.id) }"
                 @click="togglePick(p)">
              <div class="aspect-square bg-cream-200 rounded-md overflow-hidden mb-1">
                <img v-if="p.thumb_path" :src="`http://localhost:3899/images/${p.thumb_path}`" class="w-full h-full object-cover" />
              </div>
              <div class="text-xs text-ink-700 truncate">{{ p.title }}</div>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button class="btn-ghost" @click="showPagePicker = false">取消</button>
            <button class="btn-primary" @click="addPickedPages">加入本</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 大图预览 -->
    <Teleport to="body">
      <div v-if="previewPage" class="fixed inset-0 z-[60] grid place-items-center cursor-zoom-out"
           @click="previewPage = null"
           @wheel="handlePreviewWheel">
        <div class="absolute inset-0 bg-ink-900/80" @click.stop="previewPage = null" />
        <div class="relative flex flex-col items-center gap-2">
          <div class="absolute top-6 right-6 flex gap-2 z-10">
            <button class="text-2xl text-white hover:text-red-300 transition leading-none"
                    title="关闭预览 (ESC)"
                    @click.stop="previewPage = null">
              ×
            </button>
          </div>
          <div class="flex gap-2 mb-2">
            <button class="text-xs bg-white/90 text-ink-700 px-2 py-1 rounded hover:bg-white transition"
                    @click.stop="resetPreviewZoom">
              重置缩放
            </button>
            <span class="text-xs text-white">{{ Math.round(previewZoom * 100) }}%</span>
          </div>
          <div class="relative w-[92vw] h-[92vh] flex items-center justify-center overflow-hidden rounded-xl"
               @click.stop>
            <img v-if="previewPage.image_path"
                 :src="`http://localhost:3899/images/${previewPage.image_path}`"
                 class="object-contain transition-transform duration-100"
                 :style="{
                   transform: `scale(${previewZoom})`,
                   maxHeight: '100%',
                   maxWidth: '100%',
                 }" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>

  <div v-else class="text-center py-20 text-ink-500">加载中…</div>
</template>
