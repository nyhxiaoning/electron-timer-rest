import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Space, Typography, Alert, Spin } from 'antd';
import { QrcodeOutlined, MobileOutlined, SyncOutlined } from '@ant-design/icons';
import { QRLoginService, WeChatQRLoginConfig, DuoKanQRLoginConfig, LoginStatus } from '../../../main/services/QRLoginService';

const { Title, Text, Paragraph } = Typography;

export interface QRLoginProps {
  visible: boolean;
  onCancel: () => void;
  onLoginSuccess: (platform: string, authData: any) => void;
  platform: 'wechat' | 'duokan';
}

export const QRLogin: React.FC<QRLoginProps> = ({
  visible,
  onCancel,
  onLoginSuccess,
  platform
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loginStatus, setLoginStatus] = useState<'waiting' | 'scanning' | 'confirming' | 'success' | 'expired' | 'failed'>('waiting');
  const [countdown, setCountdown] = useState(180);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const loginServiceRef = useRef<QRLoginService | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const platformConfig = {
    wechat: {
      name: '微信读书',
      icon: <span className="text-green-500">📖</span>,
      description: '使用微信扫码登录微信读书，自动同步您的读书笔记',
      config: WeChatQRLoginConfig
    },
    duokan: {
      name: '多看阅读',
      icon: <span className="text-blue-500">📚</span>,
      description: '使用微信扫码登录多看阅读，自动同步您的读书笔记',
      config: DuoKanQRLoginConfig
    }
  };

  const config = platformConfig[platform];

  /**
   * 初始化扫码登录服务
   */
  const initializeLoginService = async () => {
    try {
      // 创建登录服务实例
      const loginService = new QRLoginService(config.config);
      loginServiceRef.current = loginService;

      // 监听状态变化
      loginService.on('status', (status: LoginStatus) => {
        setLoginStatus(status.status);
        
        if (status.status === 'success' && status.authData) {
          // 登录成功
          setTimeout(() => {
            onLoginSuccess(platform, status.authData);
          }, 1000);
        } else if (status.status === 'failed') {
          setErrorMessage(status.message || '登录失败，请重试');
        }
      });

      // 生成二维码
      const qrResponse = await loginService.generateQRCode();
      setQrCodeUrl(qrResponse.qrCodeUrl);
      setCountdown(qrResponse.expiresIn);
      setLoginStatus('waiting');
      
      // 开始倒计时
      startCountdown(qrResponse.expiresIn);
      
    } catch (error) {
      console.error('初始化扫码登录失败:', error);
      setErrorMessage('生成二维码失败，请重试');
      setLoginStatus('failed');
    }
  };

  /**
   * 倒计时
   */
  const startCountdown = (totalSeconds: number) => {
    setCountdown(totalSeconds);
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          setLoginStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /**
   * 刷新二维码
   */
  const handleRefresh = async () => {
    setErrorMessage('');
    setLoginStatus('waiting');
    
    // 清理现有服务
    if (loginServiceRef.current) {
      loginServiceRef.current.destroy();
      loginServiceRef.current = null;
    }
    
    // 重新初始化
    await initializeLoginService();
  };

  /**
   * 格式化倒计时
   */
  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /**
   * 获取状态消息
   */
  const getStatusMessage = () => {
    if (errorMessage) {
      return errorMessage;
    }
    
    switch (loginStatus) {
      case 'waiting':
        return '请使用微信扫一扫登录';
      case 'scanning':
        return '二维码已扫描，请在手机上确认登录';
      case 'confirming':
        return '正在确认登录...';
      case 'success':
        return '登录成功！正在同步数据...';
      case 'expired':
        return '二维码已过期，请刷新重试';
      case 'failed':
        return '登录失败，请重试';
      default:
        return '请使用微信扫一扫登录';
    }
  };

  /**
   * 获取状态图标
   */
  const getStatusIcon = () => {
    switch (loginStatus) {
      case 'waiting':
        return <QrcodeOutlined className="text-blue-500" />;
      case 'scanning':
        return <MobileOutlined className="text-green-500" />;
      case 'confirming':
        return <SyncOutlined spin className="text-orange-500" />;
      case 'success':
        return <span className="text-green-500">✓</span>;
      case 'expired':
      case 'failed':
        return <span className="text-red-500">✗</span>;
      default:
        return <QrcodeOutlined />;
    }
  };

  useEffect(() => {
    if (visible) {
      initializeLoginService();
    }
    
    return () => {
      // 清理资源
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (loginServiceRef.current) {
        loginServiceRef.current.destroy();
      }
    };
  }, [visible]);

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          {config.icon}
          <Title level={4} className="!mb-0">{config.name} 扫码登录</Title>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        (loginStatus === 'expired' || loginStatus === 'failed') && (
          <Button key="refresh" type="primary" icon={<SyncOutlined />} onClick={handleRefresh}>
            刷新二维码
          </Button>
        )
      ].filter(Boolean)}
      width={400}
      destroyOnClose
    >
      <div className="text-center py-6">
        <div className="mb-4">
          <Paragraph className="!mb-2" type="secondary">
            {config.description}
          </Paragraph>
        </div>

        {/* 二维码区域 */}
        <div className="relative inline-block mb-4">
          {loginStatus === 'waiting' && qrCodeUrl && (
            <div className="relative">
              <img 
                src={qrCodeUrl} 
                alt="登录二维码" 
                className="w-48 h-48 border-2 border-gray-200 rounded-lg"
              />
              {/* 真实场景下这里会显示实际的二维码 */}
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 rounded-lg">
                <div className="text-center text-white bg-black bg-opacity-50 p-2 rounded">
                  <QrcodeOutlined className="text-2xl mb-1" />
                  <div className="text-xs">请使用微信扫描</div>
                </div>
              </div>
            </div>
          )}
          
          {loginStatus === 'scanning' && (
            <div className="w-48 h-48 flex items-center justify-center bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="text-center">
                <MobileOutlined className="text-4xl text-blue-500 mb-2" />
                <div className="text-blue-600 font-medium">已扫描</div>
                <div className="text-xs text-blue-500 mt-1">请在手机上确认</div>
              </div>
            </div>
          )}
          
          {loginStatus === 'confirming' && (
            <div className="w-48 h-48 flex items-center justify-center bg-orange-50 rounded-lg border-2 border-orange-200">
              <div className="text-center">
                <SyncOutlined spin className="text-4xl text-orange-500 mb-2" />
                <div className="text-orange-600 font-medium">确认中</div>
                <div className="text-xs text-orange-500 mt-1">请稍候...</div>
              </div>
            </div>
          )}
          
          {loginStatus === 'success' && (
            <div className="w-48 h-48 flex items-center justify-center bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-center">
                <div className="text-4xl mb-2">✓</div>
                <div className="text-green-600 font-medium">登录成功</div>
                <div className="text-xs text-green-500 mt-1">正在同步...</div>
              </div>
            </div>
          )}
          
          {(loginStatus === 'expired' || loginStatus === 'failed') && (
            <div className="w-48 h-48 flex items-center justify-center bg-red-50 rounded-lg border-2 border-red-200">
              <div className="text-center">
                <div className="text-4xl mb-2">✗</div>
                <div className="text-red-600 font-medium">
                  {loginStatus === 'expired' ? '二维码已过期' : '登录失败'}
                </div>
                <div className="text-xs text-red-500 mt-1">
                  {loginStatus === 'expired' ? '请刷新重试' : '请重试'}
                </div>
              </div>
            </div>
          )}
          
          {!qrCodeUrl && loginStatus === 'waiting' && (
            <div className="w-48 h-48 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-gray-200">
              <Spin size="large" />
            </div>
          )}
        </div>

        {/* 状态提示 */}
        <div className="mb-4">
          <Space>
            {getStatusIcon()}
            <Text className={
              loginStatus === 'success' ? 'text-green-600' :
              (loginStatus === 'expired' || loginStatus === 'failed') ? 'text-red-600' :
              'text-gray-600'
            }>
              {getStatusMessage()}
            </Text>
          </Space>
        </div>

        {/* 倒计时 */}
        {loginStatus === 'waiting' && countdown > 0 && (
          <div className="text-sm text-gray-500">
            二维码有效期：{formatCountdown(countdown)}
          </div>
        )}

        {/* 帮助提示 */}
        <Alert
          message="使用提示"
          description={
            loginStatus === 'waiting' 
              ? "请确保您的手机已安装微信，并保持网络畅通"
              : loginStatus === 'scanning'
              ? "请在微信中点击确认登录按钮"
              : "登录成功后将自动同步您的读书笔记"
          }
          type="info"
          showIcon
          className="mt-4 text-left"
        />
      </div>
    </Modal>
  );
};

export default QRLogin;