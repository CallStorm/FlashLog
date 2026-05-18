import { registerPlugin } from '@capacitor/core';

export type TargetedShareChannel = 'wechat' | 'qq' | 'wework' | 'more';

export interface TargetedSharePlugin {
  shareText(options: {
    text: string;
    title?: string;
    channel: TargetedShareChannel;
  }): Promise<void>;
  shareFile(options: {
    uri: string;
    mimeType: string;
    title?: string;
    channel: TargetedShareChannel;
  }): Promise<void>;
}

export const TargetedShare = registerPlugin<TargetedSharePlugin>('TargetedShare');
