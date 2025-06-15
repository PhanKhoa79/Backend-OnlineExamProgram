/**
 * Code mẫu cho client để kết nối WebSocket và gửi yêu cầu kích hoạt tài khoản
 * 
 * Cần thêm thư viện socket.io-client vào dự án frontend:
 * npm install socket.io-client
 */

// Kết nối WebSocket
const connectWebSocket = (userId) => {
  const socket = io('http://localhost:5000', {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('Connected to WebSocket server');
    
    // Đăng ký người dùng với socket
    if (userId) {
      socket.emit('register', { userId });
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from WebSocket server');
  });

  socket.on('notification', (notification) => {
    console.log('Received notification:', notification);
    // Hiển thị thông báo cho người dùng
    showNotification(notification);
  });

  socket.on('notification-permission', (data) => {
    const { permission, notification } = data;
    console.log(`Received notification for permission ${permission}:`, notification);
    
    // Kiểm tra nếu người dùng có quyền này thì hiển thị thông báo
    if (hasPermission(permission)) {
      showNotification(notification);
    }
  });

  return socket;
};

// Hàm kiểm tra người dùng có quyền cụ thể không
const hasPermission = (permission) => {
  // Lấy danh sách quyền của người dùng từ localStorage hoặc state management
  const userPermissions = getUserPermissions();
  return userPermissions.includes(permission);
};

// Hàm lấy danh sách quyền của người dùng
const getUserPermissions = () => {
  // Lấy từ localStorage hoặc state management
  return JSON.parse(localStorage.getItem('userPermissions') || '[]');
};

// Hàm hiển thị thông báo
const showNotification = (notification) => {
  // Hiển thị thông báo sử dụng thư viện toast hoặc UI component
  // Ví dụ: toast.info(notification.message);
  console.log('Show notification:', notification.message);
};

// Hàm gửi yêu cầu kích hoạt lại tài khoản
const requestAccountActivation = async (email) => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/request-activation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    
    if (response.ok) {
      // Hiển thị thông báo thành công
      alert(data.message);
      return true;
    } else {
      // Hiển thị thông báo lỗi
      alert(data.message || 'Có lỗi xảy ra khi gửi yêu cầu');
      return false;
    }
  } catch (error) {
    console.error('Error requesting account activation:', error);
    alert('Có lỗi xảy ra khi gửi yêu cầu');
    return false;
  }
};

// Ví dụ sử dụng trong trang kích hoạt tài khoản
document.addEventListener('DOMContentLoaded', () => {
  // Tìm nút "Gửi yêu cầu kích hoạt lại tài khoản"
  const requestActivationButton = document.getElementById('request-activation-button');
  
  if (requestActivationButton) {
    requestActivationButton.addEventListener('click', async () => {
      // Lấy email từ URL hoặc input
      const email = getEmailFromUrlOrInput();
      
      if (email) {
        await requestAccountActivation(email);
      } else {
        alert('Không tìm thấy email');
      }
    });
  }
});

// Hàm lấy email từ URL hoặc input
const getEmailFromUrlOrInput = () => {
  // Lấy từ URL params
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');
  
  if (email) {
    return email;
  }
  
  // Hoặc lấy từ input nếu có
  const emailInput = document.getElementById('email-input');
  return emailInput ? emailInput.value : null;
}; 