<script setup lang="ts">
import { onMounted } from 'vue';

const props = defineProps<{ trigger: number }>();

function burst() {
  const colors = ['#8FB8E8', '#E4B77A', '#8FBE9E', '#D98B92', '#F5E9CF'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay = Math.random() * 0.4 + 's';
    el.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}

let lastTrigger = props.trigger;
onMounted(() => { lastTrigger = props.trigger; });
const unwatch = () => {};
import { watch } from 'vue';
watch(() => props.trigger, (v) => { if (v !== lastTrigger) { burst(); lastTrigger = v; } });
</script>

<template><div></div></template>
