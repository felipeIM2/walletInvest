// Sistema de Notificações Flutuantes - WalletInvest
// Baseado no sistema do módulo de proventos

class FloatingNotifications {
  constructor() {
    this.container = null;
    this.notifications = new Map();
    this.notificationId = 0;
    this.init();
  }

  init() {
    // Criar container se não existir
    if (!document.querySelector('.notifications-container')) {
      this.container = document.createElement('div');
      this.container.className = 'notifications-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector('.notifications-container');
    }
  }

  // Função principal para mostrar notificação
  show(message, type = 'info', options = {}) {
    const defaultOptions = {
      duration: 5000, // 5 segundos
      dismissible: true,
      showProgress: true,
      icon: this.getIcon(type)
    };

    const config = { ...defaultOptions, ...options };
    const id = ++this.notificationId;

    // Criar elemento da notificação
    const notification = this.createElement(message, type, config, id);
    
    // Adicionar ao container
    this.container.appendChild(notification);
    
    // Guardar referência
    this.notifications.set(id, {
      element: notification,
      timer: null,
      progressAnimation: null
    });

    // Animar entrada
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    // Auto-dismiss se configurado
    if (config.duration > 0) {
      this.setAutoDismiss(id, config.duration, config.showProgress);
    }

    return id;
  }

  createElement(message, type, config, id) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.setAttribute('data-id', id);

    // Ícone
    const icon = document.createElement('i');
    icon.className = `notification-icon ${config.icon}`;

    // Conteúdo
    const content = document.createElement('div');
    content.className = 'notification-content';
    content.innerHTML = message;

    // Botão de fechar
    let closeBtn = null;
    if (config.dismissible) {
      closeBtn = document.createElement('button');
      closeBtn.className = 'notification-close';
      closeBtn.innerHTML = '×';
      closeBtn.onclick = () => this.dismiss(id);
    }

    // Barra de progresso
    let progressContainer = null;
    if (config.showProgress && config.duration > 0) {
      progressContainer = document.createElement('div');
      progressContainer.className = 'notification-progress';
      
      const progressBar = document.createElement('div');
      progressBar.className = 'notification-progress-bar';
      progressContainer.appendChild(progressBar);
    }

    // Montar estrutura
    notification.appendChild(icon);
    notification.appendChild(content);
    if (closeBtn) notification.appendChild(closeBtn);
    if (progressContainer) notification.appendChild(progressContainer);

    return notification;
  }

  getIcon(type) {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-triangle',
      danger: 'fas fa-exclamation-triangle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
  }

  setAutoDismiss(id, duration, showProgress) {
    const notificationData = this.notifications.get(id);
    if (!notificationData) return;

    // Iniciar animação da barra de progresso
    if (showProgress) {
      const progressBar = notificationData.element.querySelector('.notification-progress-bar');
      if (progressBar) {
        progressBar.style.animationDuration = `${duration}ms`;
      }
    }

    // Timer para auto-dismiss
    notificationData.timer = setTimeout(() => {
      this.dismiss(id);
    }, duration);
  }

  dismiss(id) {
    const notificationData = this.notifications.get(id);
    if (!notificationData) return;

    const { element, timer } = notificationData;

    // Cancelar timer se existir
    if (timer) {
      clearTimeout(timer);
    }

    // Animar saída
    element.classList.add('hide');
    element.classList.remove('show');

    // Remover após animação
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.notifications.delete(id);
    }, 300);
  }

  // Métodos de conveniência
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', options);
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }

  // Limpar todas as notificações
  clear() {
    this.notifications.forEach((_, id) => {
      this.dismiss(id);
    });
  }
}

// Instância global
const floatingNotifications = new FloatingNotifications();

// Função para substituir alerts padrão
const showMessage = (message, type = 'info', options = {}) => {
  // Mapear tipos antigos para novos
  const typeMapping = {
    success: 'success',
    error: 'error',
    danger: 'error',
    warning: 'warning',
    info: 'info'
  };

  const mappedType = typeMapping[type] || 'info';
  
  // Remover HTML de ícones da mensagem antiga se existir
  const cleanMessage = message.replace(/<i class=[\"']fas fa-[^\"']*[\"']><\/i>\s*/g, '');
  
  return floatingNotifications.show(cleanMessage, mappedType, options);
};

// Substituir alert padrão do JavaScript
const originalAlert = window.alert;
window.alert = function(message) {
  showMessage(message, 'info');
};

// Interceptar alertas do Bootstrap se existirem e convertê-los
const interceptBootstrapAlerts = () => {
  // Observer para detectar novos alertas sendo adicionados
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('alert')) {
          // Marcar como notificação flutuante para evitar exibição no container
          node.classList.add('floating-notification');
          
          // Extrair tipo e mensagem
          let type = 'info';
          if (node.classList.contains('alert-success')) type = 'success';
          else if (node.classList.contains('alert-danger')) type = 'error';
          else if (node.classList.contains('alert-warning')) type = 'warning';
          else if (node.classList.contains('alert-info')) type = 'info';
          
          // Extrair mensagem (remover botão de fechar e ícones)
          const messageContent = node.cloneNode(true);
          const closeBtn = messageContent.querySelector('.btn-close');
          const icons = messageContent.querySelectorAll('i.fas');
          
          if (closeBtn) closeBtn.remove();
          icons.forEach(icon => icon.remove());
          
          const message = messageContent.textContent.trim();
          
          // Mostrar como notificação flutuante
          if (message) {
            floatingNotifications.show(message, type);
          }
          
          // Remover o alerta original
          setTimeout(() => {
            if (node.parentNode) {
              node.parentNode.removeChild(node);
            }
          }, 100);
        }
      });
    });
  });

  // Observar mudanças no container principal
  const container = document.querySelector('.container, .container-rateio, body');
  if (container) {
    observer.observe(container, { childList: true, subtree: true });
  }
};

// Inicializar quando o DOM estiver carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', interceptBootstrapAlerts);
} else {
  interceptBootstrapAlerts();
}

// Exportar para uso global
window.floatingNotifications = floatingNotifications;
window.showMessage = showMessage;