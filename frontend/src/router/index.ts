import { createRouter, createWebHashHistory } from 'vue-router';
import Calendar from '@/pages/Calendar.vue';
import Pages from '@/pages/Pages.vue';
import Books from '@/pages/Books.vue';
import BookDetail from '@/pages/BookDetail.vue';
import Stats from '@/pages/Stats.vue';
import Settings from '@/pages/Settings.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/calendar' },
    { path: '/calendar', name: 'calendar', component: Calendar, meta: { title: '日历看板' } },
    { path: '/pages', name: 'pages', component: Pages, meta: { title: '画页库' } },
    { path: '/books', name: 'books', component: Books, meta: { title: '本管理' } },
    { path: '/books/:id', name: 'book-detail', component: BookDetail, meta: { title: '本详情' } },
    { path: '/stats', name: 'stats', component: Stats, meta: { title: '稿费统计' } },
    { path: '/settings', name: 'settings', component: Settings, meta: { title: '设置' } },
  ],
});

export default router;
