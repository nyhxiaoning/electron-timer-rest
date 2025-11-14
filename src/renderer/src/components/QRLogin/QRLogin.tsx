import React, { useState, useEffect } from 'react';
import { Modal, Button, Space, Typography, Alert } from 'antd';
import { QrcodeOutlined, MobileOutlined, SyncOutlined } from '@ant-design/icons';

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
  const [loginStatus, setLoginStatus] = useState<'waiting' | 'scanning' | 'confirming' | 'success' | 'expired'>('waiting');
  const [countdown, setCountdown] = useState(180); // 3分钟有效期

  const platformConfig = {
    wechat: {
      name: '微信读书',
      icon: <span className="text-green-500">📖</span>,
      description: '使用微信扫码登录微信读书，自动同步您的读书笔记'
    },
    duokan: {
      name: '多看阅读',
      icon: <span className="text-blue-500">📚</span>,
      description: '使用微信扫码登录多看阅读，自动同步您的读书笔记'
    }
  };

  const config = platformConfig[platform];

  // 生成二维码
  const generateQRCode = async () => {
    try {
      // 模拟生成二维码URL
      // 实际项目中这里应该调用后端API获取真实的登录二维码
      const mockQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        `login-${platform}-${Date.now()}`
      )}`;
      
      setQrCodeUrl(mockQrUrl);
      setLoginStatus('waiting');
      setCountdown(180);
      
      // 开始轮询登录状态
      startLoginPolling();
    } catch (error) {
      console.error('生成二维码失败:', error);
    }
  };

  // 轮询登录状态
  const startLoginPolling = () => {
    // 模拟轮询登录状态
    // 实际项目中这里应该调用后端API检查登录状态
    const pollInterval = setInterval(() => {
      // 模拟随机状态变化
      const random = Math.random();
      if (random < 0.1) {
        setLoginStatus('scanning');
      } else if (random < 0.2) {
        setLoginStatus('confirming');
      } else if (random < 0.3) {
        setLoginStatus('success');
        clearInterval(pollInterval);
        
        // 登录成功
        setTimeout(() => {
          onLoginSuccess(platform, {
            token: `mock-token-${platform}-${Date.now()}`,
            userId: `user-${Date.now()}`,
            expiresIn: 7200
          });
        }, 1000);
      }
    }, 2000);

    // 倒计时
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(pollInterval);
          clearInterval(countdownInterval);
          setLoginStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 清理定时器
    return () => {
      clearInterval(pollInterval);
      clearInterval(countdownInterval);
    };
  };

  // 刷新二维码
  const handleRefresh = () => {
    generateQRCode();
  };

  // 格式化倒计时
  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (visible) {
      generateQRCode();
    }
  }, [visible]);

  const getStatusMessage = () => {
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
      default:
        return '请使用微信扫一扫登录';
    }
  };

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
        return <span className="text-red-500">✗</span>;
      default:
        return <QrcodeOutlined />;
    }
  };

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
        loginStatus === 'expired' && (
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
          {qrCodeUrl && loginStatus !== 'success' && (
            <div className="relative">
              <img 
                src={qrCodeUrl} 
                alt="登录二维码" 
                className="w-48 h-48 border-2 border-gray-200 rounded-lg"
              />
              {loginStatus === 'expired' && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                  <div className="text-center text-white">
                    <div className="text-lg mb-2">二维码已过期</div>
                    <Button type="primary" size="small" onClick={handleRefresh}>
                      刷新
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {loginStatus === 'success' && (
            <div className="w-48 h-48 flex items-center justify-center bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-center">
                <div className="text-4xl mb-2">✓</div>
                <div className="text-green-600 font-medium">登录成功</div>
              </div>
            </div>
          )}
        </div>

        {/* 状态提示 */}
        <div className="mb-4">
          <Space>
            {getStatusIcon()}
            <Text className={
              loginStatus === 'success' ? 'text-green-600' :
              loginStatus === 'expired' ? 'text-red-600' :
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
          description="请确保您的手机已安装微信，并保持网络畅通"
          type="info"
          showIcon
          className="mt-4 text-left"
        />
      </div>
    </Modal>
  );
};

export default QRLogin;