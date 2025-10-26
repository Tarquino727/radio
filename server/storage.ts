import { randomUUID } from "crypto";
import type { RadioState, QueueItem, Song, RadioInfo } from "@shared/schema";

// Storage interface for multi-radio management
export interface IStorage {
  // Radio operations
  getRadio(name: string): Promise<RadioState | undefined>;
  createRadio(name: string): Promise<RadioState>;
  updateRadioState(name: string, state: Partial<RadioState>): Promise<RadioState>;
  getAllRadios(): Promise<RadioState[]>;
  getAllRadioInfo(): Promise<RadioInfo[]>;
  renameRadio(oldName: string, newName: string): Promise<void>;
  deleteRadio(name: string): Promise<void>;
  radioExists(name: string): Promise<boolean>;
  
  // Queue operations
  addToQueue(radioName: string, song: Song): Promise<QueueItem>;
  removeFromQueue(radioName: string, queueItemId: string): Promise<void>;
  getNextInQueue(radioName: string): Promise<QueueItem | undefined>;
}

export class MemStorage implements IStorage {
  private radios: Map<string, RadioState>;

  constructor() {
    this.radios = new Map();
    
    // Create default "lofi" radio
    this.radios.set("lofi", {
      name: "lofi",
      queue: [],
      currentSong: null,
      isPlaying: false,
    });
  }

  async getRadio(name: string): Promise<RadioState | undefined> {
    return this.radios.get(name);
  }

  async createRadio(name: string): Promise<RadioState> {
    if (this.radios.has(name)) {
      throw new Error(`Radio ${name} already exists`);
    }
    
    const radio: RadioState = {
      name,
      queue: [],
      currentSong: null,
      isPlaying: false,
    };
    this.radios.set(name, radio);
    return radio;
  }

  async updateRadioState(name: string, state: Partial<RadioState>): Promise<RadioState> {
    const radio = this.radios.get(name);
    if (!radio) {
      throw new Error(`Radio ${name} not found`);
    }
    const updated = { ...radio, ...state };
    this.radios.set(name, updated);
    return updated;
  }

  async getAllRadios(): Promise<RadioState[]> {
    return Array.from(this.radios.values());
  }

  async getAllRadioInfo(): Promise<RadioInfo[]> {
    return Array.from(this.radios.values()).map(radio => ({
      name: radio.name,
      queueLength: radio.queue.length,
      isPlaying: radio.isPlaying,
    }));
  }

  async renameRadio(oldName: string, newName: string): Promise<void> {
    const radio = this.radios.get(oldName);
    if (!radio) {
      throw new Error(`Radio ${oldName} not found`);
    }
    
    if (this.radios.has(newName)) {
      throw new Error(`Radio ${newName} already exists`);
    }
    
    // Update radio name
    radio.name = newName;
    
    // Move to new key
    this.radios.delete(oldName);
    this.radios.set(newName, radio);
  }

  async deleteRadio(name: string): Promise<void> {
    if (!this.radios.has(name)) {
      throw new Error(`Radio ${name} not found`);
    }
    this.radios.delete(name);
  }

  async radioExists(name: string): Promise<boolean> {
    return this.radios.has(name);
  }

  async addToQueue(radioName: string, song: Song): Promise<QueueItem> {
    const radio = this.radios.get(radioName);
    if (!radio) {
      throw new Error(`Radio ${radioName} not found`);
    }

    const queueItem: QueueItem = {
      id: randomUUID(),
      song,
      addedAt: Date.now(),
    };

    radio.queue.push(queueItem);
    this.radios.set(radioName, radio);
    return queueItem;
  }

  async removeFromQueue(radioName: string, queueItemId: string): Promise<void> {
    const radio = this.radios.get(radioName);
    if (!radio) {
      throw new Error(`Radio ${radioName} not found`);
    }

    radio.queue = radio.queue.filter(item => item.id !== queueItemId);
    this.radios.set(radioName, radio);
  }

  async getNextInQueue(radioName: string): Promise<QueueItem | undefined> {
    const radio = this.radios.get(radioName);
    if (!radio || radio.queue.length === 0) {
      return undefined;
    }

    const nextItem = radio.queue.shift();
    this.radios.set(radioName, radio);
    return nextItem;
  }
}

export const storage = new MemStorage();
