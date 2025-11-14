import { EventEmitter } from 'events';
import axios from 'axios';

export interface QRLoginConfig {
  platform: 'wechat' | 'duokan';
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface QRCodeResponse {
  qrCodeUrl: string;
  sceneId: string;
  expiresIn: number;
}

export interface LoginStatus {
  status: 'waiting' | 'scanning' | 'confirming' | 'success' | 'expired' | 'failed';
  message: string;
  authData?: {
    token: string;
    refreshToken: string;
    expiresIn: number;
    userInfo: {
      openId: string;
      nickname: string;
      avatar?: string;
    };
  };
}

/**
 * 真实的扫码登录服务
 * 集成微信读书和多看阅读的OAuth流程
 */
export class QRLoginService extends EventEmitter {
  private config: QRLoginConfig;
  private pollingInterval?: NodeJS.Timeout;
  private sceneId?: string;
  private isPolling = false;

  constructor(config: QRLoginConfig) {
    super();
    this.config = config;
  }

  /**
   * 生成登录二维码
   */
  async generateQRCode(): Promise<QRCodeResponse> {
    try {
      // 1. 调用后端API获取二维码
      const response = await axios.post('/api/auth/qr-code', {
        platform: this.config.platform,
        appId: this.config.appId,
        redirectUri: this.config.redirectUri
      });

      const { qrCodeUrl, sceneId, expiresIn } = response.data;
      
      this.sceneId = sceneId;
      
      // 2. 开始轮询登录状态
      this.startPolling(sceneId);
      
      return {
        qrCodeUrl,
        sceneId,
        expiresIn
      };
    } catch (error) {
      console.error('生成二维码失败:', error);
      throw new Error('生成二维码失败，请稍后重试');
    }
  }

  /**
   * 轮询登录状态
   */
  private startPolling(sceneId: string): void {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    let pollCount = 0;
    const maxPolls = 90; // 最多轮询90次，约3分钟

    this.pollingInterval = setInterval(async () => {
      pollCount++;
      
      if (pollCount >= maxPolls) {
        this.stopPolling();
        this.emit('status', {
          status: 'expired',
          message: '二维码已过期，请刷新重试'
        } as LoginStatus);
        return;
      }

      try {
        // 查询登录状态
        const status = await this.checkLoginStatus(sceneId);
        this.emit('status', status);

        if (status.status === 'success' && status.authData) {
          this.stopPolling();
          // 登录成功，保存认证信息
          this.saveAuthData(status.authData);
        }
      } catch (error) {
        console.error('轮询登录状态失败:', error);
      }
    }, 2000); // 每2秒轮询一次
  }

  /**
   * 检查登录状态
   */
  private async checkLoginStatus(sceneId: string): Promise<LoginStatus> {
    try {
      const response = await axios.get(`/api/auth/qr-status/${sceneId}`);
      return response.data;
    } catch (error) {
      console.error('检查登录状态失败:', error);
      return {
        status: 'failed',
        message: '检查登录状态失败'
      };
    }
  }

  /**
   * 停止轮询
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
      this.isPolling = false;
    }
  }

  /**
   * 保存认证数据
   */
  private saveAuthData(authData: any): void {
    // 保存到本地存储或数据库
    const key = `auth_${this.config.platform}`;
    localStorage.setItem(key, JSON.stringify({
      ...authData,
      timestamp: Date.now()
    }));
  }

  /**
   * 获取保存的认证数据
   */
  getSavedAuthData(): any {
    const key = `auth_${this.config.platform}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // 检查是否过期
        const expiresAt = data.timestamp + (data.expiresIn * 1000);
        if (Date.now() < expiresAt) {
          return data;
        } else {
          // 已过期，清除数据
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error('解析认证数据失败:', error);
      }
    }
    return null;
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      const response = await axios.post('/api/auth/refresh', {
        platform: this.config.platform,
        refreshToken
      });
      
      const { accessToken, expiresIn } = response.data;
      
      // 更新保存的认证数据
      const savedData = this.getSavedAuthData();
      if (savedData) {
        savedData.token = accessToken;
        savedData.expiresIn = expiresIn;
        savedData.timestamp = Date.now();
        this.saveAuthData(savedData);
      }
      
      return accessToken;
    } catch (error) {
      console.error('刷新令牌失败:', error);
      throw new Error('刷新令牌失败');
    }
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    try {
      const authData = this.getSavedAuthData();
      if (authData?.token) {
        await axios.post('/api/auth/logout', {
          platform: this.config.platform,
          token: authData.token
        });
      }
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      // 清除本地数据
      const key = `auth_${this.config.platform}`;
      localStorage.removeItem(key);
      this.stopPolling();
    }
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.stopPolling();
    this.removeAllListeners();
  }
}

/**
 * 微信读书扫码登录配置
 */
export const WeChatQRLoginConfig: QRLoginConfig = {
  platform: 'wechat',
  appId: process.env.WECHAT_APP_ID || 'wx1234567890',
  appSecret: process.env.WECHAT_APP_SECRET || '',
  redirectUri: 'https://your-app.com/auth/wechat/callback'
};

/**
 * 多看阅读扫码登录配置
 */
export const DuoKanQRLoginConfig: QRLoginConfig = {
  platform: 'duokan',
  appId: process.env.DUOKAN_APP_ID || 'dk1234567890',
  appSecret: process.env.DUOKAN_APP_SECRET || '',
  redirectUri: 'https://your-app.com/auth/duokan/callback'
};