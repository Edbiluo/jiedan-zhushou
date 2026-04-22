<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import BookCard from '@/components/BookCard.vue';
import { useBooksStore } from '@/stores/books';
import { useSettingsStore } from '@/stores/settings';
import type { CreateBookInput, Sided } from '@/types';
import dayjs from 'dayjs';

const books = useBooksStore();
const settings = useSettingsStore();
const router = useRouter();

const activeStatus = ref<string>('');
const showCreate = ref(false);

const todayStr = dayjs().format('YYYY-MM-DD');

function emptyForm(): CreateBookInput {
  return {
    title: '',
    unit_price: 0,
    start_date: todayStr,
    deadline: dayjs().add(14, 'day').format('YYYY-MM-DD'),
    page_count: 1,
    size_id: null,
    style_id: null,
    sided: 'single',
    has_video: 0,
    note: '',
  };
}

const form = reactive<CreateBookInput>(emptyForm());
const creating = ref(false);
const formError = ref('');

onMounted(async () => {
  if (!settings.loaded) await settings.load();
  await books.reload();
});

const filtered = computed(() => activeStatus.value ? books.list.filter((b) => b.status === activeStatus.value) : books.list);

async function submit() {
  formError.value = '';
  if (!form.title.trim()) { formError.value = '请填写本名称'; return; }
  if (!form.start_date || !form.deadline) { formError.value = '请填写开画日期和完成日期'; return; }
  if (form.start_date < todayStr) { formError.value = '开画日期不能早于今天'; return; }
  if (form.deadline < form.start_date) { formError.value = '完成日期不能早于开画日期'; return; }
  if ((form.page_count ?? 0) <= 0) { formError.value = '页数至少为 1'; return; }

  creating.value = true;
  try {
    const created = await books.create({ ...form });
    showCreate.value = false;
    Object.assign(form, emptyForm());
    // 创建完进详情页补画页
    router.push(`/books/${created.id}`);
  } catch (e: any) {
    formError.value = e?.message || '创建失败';
  } finally {
    creating.value = false;
  }
}

function openBook(b: { id: number }) {
  router.push(`/books/${b.id}`);
}

function openCreate() {
  Object.assign(form, emptyForm());
  formError.value = '';
  showCreate.value = true;
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 flex-wrap">
      <button v-for="s in [['','全部'],['in_progress','进行中'],['near_deadline','快到交付'],['overdue','延期'],['completed','已完成']]" :key="s[0]"
              class="btn-ghost text-sm"
              :class="{ '!bg-brand-400 !text-white': activeStatus === s[0] }"
              @click="activeStatus = s[0]">{{ s[1] }}</button>
      <button class="btn-primary ml-auto" @click="openCreate">＋ 新建本</button>
    </div>

    <div v-if="!filtered.length" class="text-center py-20 text-ink-500">
      还没有本，点上面按钮创建一个吧 ✿
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <BookCard v-for="b in filtered" :key="b.id" :book="b" @open="openBook" />
    </div>

    <!-- 创建本轻量弹窗 -->
    <Teleport to="body">
      <div v-if="showCreate" class="fixed inset-0 z-50 grid place-items-center">
        <div class="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" @click="showCreate = false" />
        <div class="relative card w-[640px] max-w-[95vw] max-h-[90vh] overflow-auto animate-pop">
          <h3 class="text-lg text-brand-700 mb-1">新建本</h3>
          <p class="text-xs text-ink-500 mb-4">填好基础信息就可以创建，画页进详情页再补 ✿</p>

          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2">
              <label class="text-xs text-ink-500">本名称 <span class="text-[#D98B92]">*</span></label>
              <input v-model="form.title" class="input" placeholder="比如：小鹿的樱花本" />
            </div>

            <div>
              <label class="text-xs text-ink-500">单价 (¥)</label>
              <input v-model.number="form.unit_price" type="number" min="0" step="1" class="input" />
            </div>
            <div>
              <label class="text-xs text-ink-500">页数</label>
              <input v-model.number="form.page_count" type="number" min="1" step="1" class="input" />
            </div>

            <div>
              <label class="text-xs text-ink-500">开画日期 <span class="text-[#D98B92]">*</span></label>
              <input v-model="form.start_date" type="date" :min="todayStr" class="input" />
            </div>
            <div>
              <label class="text-xs text-ink-500">完成日期 <span class="text-[#D98B92]">*</span></label>
              <input v-model="form.deadline" type="date" class="input" />
            </div>

            <div>
              <label class="text-xs text-ink-500">款式</label>
              <select v-model="form.style_id" class="input">
                <option :value="null">不选</option>
                <option v-for="s in settings.styles" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-ink-500">规格</label>
              <select v-model="form.size_id" class="input">
                <option :value="null">不选</option>
                <option v-for="s in settings.sizes" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>

            <div>
              <label class="text-xs text-ink-500">单/双面</label>
              <select v-model="form.sided" class="input">
                <option value="single">单面</option>
                <option value="double">双面</option>
              </select>
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
                <input type="checkbox"
                       :checked="!!form.has_video"
                       @change="(e) => form.has_video = (e.target as HTMLInputElement).checked ? 1 : 0" />
                含视频录制步骤（完成日次日加一项剪辑）
              </label>
            </div>

            <div class="col-span-2">
              <label class="text-xs text-ink-500">备注</label>
              <textarea v-model="form.note" class="input" rows="2" placeholder="可选" />
            </div>
          </div>

          <div v-if="formError" class="mt-3 text-sm text-[#D98B92]">{{ formError }}</div>

          <div class="flex justify-end gap-2 mt-5">
            <button class="btn-ghost" :disabled="creating" @click="showCreate = false">取消</button>
            <button class="btn-primary" :disabled="creating" @click="submit">
              {{ creating ? '创建中…' : '创建本' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
