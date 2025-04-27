<script setup lang="ts">
import { ref } from "vue";
import { RangeFinderClient } from "./client";

const connected = ref<boolean>(false);
const connecting = ref<boolean>(false);
const measuredValue = ref<number>(0);
const history = ref<{ dt: Date; value: number }[]>([]);
const continuousMeasure = ref<boolean>(false);

const client = new RangeFinderClient();

client.onConnect = () => {
  connected.value = true;
};

client.onDisconnect = () => {
  connected.value = false;
};

client.onMeasure = (value: number) => {
  measuredValue.value = value;
  history.value.unshift({
    dt: new Date(),
    value,
  });
};

const connectPressed = () => {
  connecting.value = true;
  client
    .connect()
    .catch((e) => alert(`${e}`))
    .finally(() => (connecting.value = false));
};

const disconnectPressed = () => {
  client.disconnect();
};

const continuousPressed = () => {
  if (continuousMeasure.value) {
    client.stopContinuousMeasure();
  } else {
    client.startContinuousMeasure();
  }

  continuousMeasure.value = !continuousMeasure.value;
};
</script>

<template>
  <div class="row">
    <button v-if="!connected" @click="connectPressed" :disabled="connecting">Connect</button>
    <button v-else @click="disconnectPressed" class="disconnect">Disconnect</button>
  </div>

  <div class="row" v-if="connected">
    <button @click="continuousPressed" class="continuous">
      {{ continuousMeasure ? "Stop" : "Start" }} measure
    </button>
  </div>

  <h1>{{ measuredValue }} m</h1>

  <div class="row">
    <div>History</div>
    <div class="history">
      <div class="history-item" v-for="(item, idx) in history" :key="item.value">
        <span class="time">[{{ item.dt.toLocaleTimeString() }}]</span>
        <span class="value">{{ item.value }} m</span>
        <span class="latest" v-if="idx === 0">latest</span>
      </div>
    </div>
  </div>
</template>

<style>
.history {
  height: 240px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-color: rebeccapurple green;
  padding: 0 8px;
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 164px;
}

.history-item {
  display: flex;
  gap: 4px;
}

.history-item .time {
  color: #858585;
}

.history-item .latest {
  user-select: none;
  color: #858585;
}

button.disconnect {
  background-color: #aa4343;
}

button.continuous {
  background-color: #cca949;
}
</style>
