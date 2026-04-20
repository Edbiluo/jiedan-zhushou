<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import BookCard from '@/components/BookCard.vue';
import PageCard from '@/components/PageCard.vue';
import { useBooksStore } from '@/stores/books';
import { usePagesStore } from '@/stores/pages';
import { useSettingsStore } from '@/stores/settings';
import dayjs from 'dayjs';

const books = useBooksStore();
const pages = usePagesStore();
const settings = useSettingsStore();
const router = useRouter();

const activeStatus = ref<string>('');
const showCreate = ref(false);
const selectedPageIds = ref<Set<number>>(new Set());
const form = reactive({
  title: '',
  unit_price: 0,
  deadline: dayjs().add(14, 'day').format('YYYY-MM-DD'),
  note: '',
});

onMounted(async () => {
  if (!settings.loaded) await settings.load();
  await Promise.all([books.reload(), pages.reload()]);
});

const filtered = computed(() => activeStatus.value ? books.list.filter((b) => b.status === activeStatus.value) : books.list);

function toggleSelect(p: { id: number }) {
  if (selectedPageIds.value.has(p.id)) selectedPageIds.value.delete(p.id);
  else selectedPageIds.value.add(p.id);
  selectedPageIds.value = new Set(selectedPageIds.value);
}

async function submit() {
  if (!form.title) return alert('请填写本名');
  if (selectedPageIds.value.size === 0) return alert('至少选择一个画页');
  await books.create({ ...form, page_ids: Array.from(selectedPageIds.value) });
  showCreate.value = false;
  selectedPageIds.value = new Set();
  form.title = ''; form.unit_price = 0; form.note = '';
  form.deadline = dayjs().add(14, 'day').format('YYYY-MM-DD');
}

function openBook(b: { id: number }) {
  router.push(`/books/${b.id}`);
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <button v-for="s in [['','全部'],['in_progress','进行中'],['near_deadline','快到交付'],['overdue','延期'],['completed','已完成']]" :key="s[0]"
              class="btn-ghost font-hand text-sm"
              :class="{ '!bg-brand-400 !text-white': activeStatus === s[0] }"
              @click="activeStatus = s[0]">{{ s[1] }}</button>
      <button class="btn-primary font-hand ml-auto" @click="showCreate = true">＋ 新建本</button>
    </div>

    <div v-if="!filtered.length" class="text-center py-20 text-ink-500 font-hand">
      还没有本，点上面按钮创建一个吧 ✿
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <BookCard v-for="b in filtered" :key="b.id" :book="b" @open="openBook" />
    </div>

    <!-- 创建本弹窗 -->
    <Teleport to="body">
      <div v-if="showCreate" class="fixed inset-0 z-50 grid place-items-center">
        <div class="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" @click="showCreate = false" />
        <div class="relative card w-[780px] max-w-[95vw] max-h-[90vh] overflow-auto animate-pop">
          <h3 class="text-lg font-hand text-brand-700 mb-4">新建本</h3>
          <div class="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label class="text-xs text-ink-500 font-hand">本名</label>
              <input v-model="form.title" class="input" placeholder="比如：小鹿的本" />
            </div>
            <div>
              <label class="text-xs text-ink-500 font-hand">单价 (¥)</label>
              <input v-model.number="form.unit_price" type="number" class="input" />
            </div>
            <div>
              <label class="text-xs text-ink-500 font-hand">交付日期</label>
              <input v-model="form.deadline" type="date" class="input" />
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs text-ink-500 font-hand">选择画页（点击切换选中）</label>
              <span class="text-xs text-ink-500 font-hand">已选 {{ selectedPageIds.size }} 个</span>
            </div>
            <div v-if="!pages.list.length" class="text-sm text-ink-500 py-8 text-center font-hand">
              画页库是空的，先去画页库上传吧
            </div>
            <div v-else class="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-[40vh] overflow-auto p-1">
              <PageCard v-for="p in pages.list" :key="p.id" :page="p" selectable :selected="selectedPageIds.has(p.id)" @click="toggleSelect" />
            </div>
          </div>
          <div>
            <label class="text-xs text-ink-500 font-hand">备注</label>
            <textarea v-model="form.note" class="input" rows="2" />
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button class="btn-ghost font-hand" @click="showCreate = false">取消</button>
            <button class="btn-primary font-hand" @click="submit">创建 + 自动排期</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
