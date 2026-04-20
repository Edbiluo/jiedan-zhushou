<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const pageTitle = computed(() => (route.meta?.title as string) || '接单助手');

const navs = [
  { to: '/calendar', label: '日历看板', icon: '📅' },
  { to: '/pages',    label: '画页库',   icon: '🖼️' },
  { to: '/books',    label: '本管理',   icon: '📖' },
  { to: '/stats',    label: '稿费统计', icon: '💰' },
  { to: '/settings', label: '设置',     icon: '⚙️' },
];
</script>

<template>
  <div class="h-full grid" style="grid-template-columns: 220px 1fr;">
    <aside class="bg-cream-200/50 border-r border-cream-300/40 py-6 px-4 flex flex-col">
      <div class="mb-8 px-2">
        <h1 class="text-xl font-hand text-brand-700">接单助手</h1>
        <p class="text-xs text-ink-500 mt-1 font-hand">一起好好画画 ✿</p>
      </div>
      <nav class="flex flex-col gap-1">
        <RouterLink v-for="n in navs" :key="n.to" :to="n.to" custom v-slot="{ isActive, navigate }">
          <div class="sidebar-item" :class="{ active: isActive }" @click="navigate">
            <span class="text-lg">{{ n.icon }}</span>
            <span class="font-hand text-sm">{{ n.label }}</span>
          </div>
        </RouterLink>
      </nav>
      <div class="mt-auto text-xs text-ink-500 px-2">
        <p class="font-hand">v0.1.0 · 本地数据</p>
      </div>
    </aside>

    <main class="flex flex-col min-h-0 overflow-hidden">
      <header class="bg-cream-100/80 backdrop-blur px-8 py-4 border-b border-cream-300/50 z-10 shrink-0">
        <h2 class="text-2xl font-hand text-ink-900">{{ pageTitle }}</h2>
      </header>
      <div class="p-8 flex-1 min-h-0 overflow-auto">
        <RouterView v-slot="{ Component }">
          <transition name="fade">
            <component :is="Component" class="animate-rise" />
          </transition>
        </RouterView>
      </div>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
