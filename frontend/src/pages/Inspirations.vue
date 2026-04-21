<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useInspirationsStore } from '@/stores/inspirations';
import type { Inspiration } from '@/types';

const store = useInspirationsStore();

const uploadOpen = ref(false);
const uploadForm = reactive({ src_path: '', note: '' });
const submitting = ref(false);

const editing = ref<Inspiration | null>(null);
const editNote = ref('');

const preview = ref<Inspiration | null>(null);

onMounted(async () => { await store.reload(); });

async function pickImage() {
  if ((window as any).electronAPI?.pickImage) {
    const p = await (window as any).electronAPI.pickImage();
    if (p) uploadForm.src_path = p;
  } else {
    uploadForm.src_path = prompt('开发态输入图片绝对路径：') || '';
  }
}

function openUpload() {
  uploadForm.src_path = '';
  uploadForm.note = '';
  uploadOpen.value = true;
}

async function submitUpload() {
  if (!uploadForm.src_path) { alert('请先选择图片'); return; }
  submitting.value = true;
  try {
    await store.create({ src_path: uploadForm.src_path, note: uploadForm.note });
    uploadOpen.value = false;
  } finally { submitting.value = false; }
}

function openEdit(item: Inspiration) {
  editing.value = item;
  editNote.value = item.note || '';
}

async function saveEdit() {
  if (!editing.value) return;
  await store.update(editing.value.id, { note: editNote.value });
  editing.value = null;
}

async function removeItem(item: Inspiration) {
  if (!confirm('删除这张图？')) return;
  await store.remove(item.id);
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3 flex-wrap">
      <p class="text-sm text-ink-500">灵感 / 粉丝投稿都存在这里，有空翻翻找思路 ✿</p>
      <input v-model="store.keyword" placeholder="搜索备注..." class="input !w-56 ml-auto"
             @keyup.enter="store.reload()" />
      <button class="btn-primary" @click="openUpload">＋ 添加图片</button>
    </div>

    <div v-if="store.loading" class="text-center py-10 text-ink-500">加载中...</div>
    <div v-else-if="!store.list.length" class="text-center py-20 text-ink-500">
      还没有图，点上面按钮添加一张吧 ✿
    </div>
    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <div v-for="item in store.list" :key="item.id"
           class="card p-3 relative group hover:-translate-y-1 hover:shadow-pop transition">
        <div class="aspect-square bg-cream-200 rounded-xl2 overflow-hidden cursor-zoom-in"
             @click="preview = item">
          <img v-if="item.thumb_path"
               :src="`http://localhost:3899/images/${item.thumb_path}`"
               class="w-full h-full object-cover" />
        </div>
        <p v-if="item.note" class="text-xs text-ink-700 mt-2 whitespace-pre-wrap line-clamp-3">{{ item.note }}</p>
        <p v-else class="text-xs text-ink-400 mt-2 italic">（无备注）</p>
        <div class="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button class="bg-white/90 hover:bg-brand-400 hover:text-white shadow-soft rounded-full w-7 h-7 grid place-items-center text-xs"
                  title="编辑备注" @click.stop="openEdit(item)">✎</button>
          <button class="bg-white/90 hover:bg-[#D98B92] hover:text-white shadow-soft rounded-full w-7 h-7 grid place-items-center text-xs"
                  title="删除" @click.stop="removeItem(item)">✕</button>
        </div>
      </div>
    </div>

    <!-- 上传弹窗 -->
    <Teleport to="body">
      <div v-if="uploadOpen" class="fixed inset-0 z-50 grid place-items-center">
        <div class="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" @click="uploadOpen = false" />
        <div class="relative card w-[480px] max-w-[92vw] animate-pop">
          <h3 class="text-lg text-brand-700 mb-3">添加灵感图</h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-ink-500">图片</label>
              <div class="flex gap-2 items-center">
                <button class="btn-ghost" @click="pickImage">选择图片</button>
                <span class="text-xs text-ink-500 truncate">{{ uploadForm.src_path || '未选择' }}</span>
              </div>
            </div>
            <div>
              <label class="text-xs text-ink-500">备注</label>
              <textarea v-model="uploadForm.note" rows="3" class="input" placeholder="灵感说明 / 粉丝投稿来源等（可选）" />
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button class="btn-ghost" :disabled="submitting" @click="uploadOpen = false">取消</button>
            <button class="btn-primary" :disabled="submitting" @click="submitUpload">
              {{ submitting ? '上传中…' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 编辑备注 -->
    <Teleport to="body">
      <div v-if="editing" class="fixed inset-0 z-50 grid place-items-center">
        <div class="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" @click="editing = null" />
        <div class="relative card w-[480px] max-w-[92vw] animate-pop">
          <h3 class="text-lg text-brand-700 mb-3">编辑备注</h3>
          <div class="aspect-video bg-cream-200 rounded-xl2 overflow-hidden mb-3">
            <img v-if="editing.thumb_path"
                 :src="`http://localhost:3899/images/${editing.thumb_path}`"
                 class="w-full h-full object-contain" />
          </div>
          <textarea v-model="editNote" rows="4" class="input" />
          <div class="flex justify-end gap-2 mt-4">
            <button class="btn-ghost" @click="editing = null">取消</button>
            <button class="btn-primary" @click="saveEdit">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 大图预览 -->
    <Teleport to="body">
      <div v-if="preview" class="fixed inset-0 z-[60] grid place-items-center cursor-zoom-out"
           @click="preview = null">
        <div class="absolute inset-0 bg-ink-900/80" />
        <img :src="`http://localhost:3899/images/${preview.image_path}`"
             class="relative max-h-[92vh] max-w-[92vw] object-contain rounded-xl shadow-pop" />
      </div>
    </Teleport>
  </div>
</template>
