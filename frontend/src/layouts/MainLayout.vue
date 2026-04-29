<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { computed } from 'vue';
import UpdateBadge from '@/components/UpdateBadge.vue';
import { useSettingsStore } from '@/stores/settings';

const route = useRoute();
const pageTitle = computed(() => (route.meta?.title as string) || '接单助手');
const settingsStore = useSettingsStore();
const appName = computed(() => settingsStore.settings.app_name || '小猪的接单小助手');

const navs = [
  { to: '/calendar',     label: '日历看板', icon: '📅' },
  { to: '/books',        label: '本管理',   icon: '📖' },
  { to: '/pages',        label: '画页库',   icon: '🖼️' },
  { to: '/inspirations', label: '创作中心', icon: '✨' },
  { to: '/stats',        label: '稿费统计', icon: '💰' },
  { to: '/settings',     label: '设置',     icon: '⚙️' },
];
</script>

<template>
  <div class="h-full grid" style="grid-template-columns: 220px 1fr;">
    <aside class="bg-cream-200/50 border-r border-cream-300/40 py-6 px-4 flex flex-col">
      <div class="mb-8 px-2">
        <h1 class="text-xl text-brand-700">{{ appName }}</h1>
        <p class="text-xs text-ink-500 mt-1">一起好好画画 ✿</p>
      </div>
      <nav class="flex flex-col gap-1">
        <RouterLink v-for="n in navs" :key="n.to" :to="n.to" custom v-slot="{ isActive, navigate }">
          <div class="sidebar-item" :class="{ active: isActive }" @click="navigate">
            <span class="text-lg">{{ n.icon }}</span>
            <span class="text-sm">{{ n.label }}</span>
          </div>
        </RouterLink>
      </nav>
      <div class="mt-auto text-xs text-ink-500 px-2">
        <p>v0.2.0 · 本地数据</p>
      </div>
    </aside>

    <main class="flex flex-col min-h-0">
      <header class="bg-cream-100/80 backdrop-blur px-8 py-4 border-b border-cream-300/50 z-10 shrink-0 flex items-center justify-between gap-4">
        <h2 class="text-2xl text-ink-900">{{ pageTitle }}</h2>
        <UpdateBadge />
      </header>
      <div class="flex-1 min-h-0 overflow-auto flex flex-col p-6">
        <RouterView v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </RouterView>
      </div>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active { transition: opacity .22s ease-out; }
.fade-leave-active { transition: opacity .18s ease-in; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
