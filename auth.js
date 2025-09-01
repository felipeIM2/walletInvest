// ===== SISTEMA DE AUTENTICAÇÃO POR TOKEN =====

class AuthManager {
    static getUser() {
        try {
            const userData = sessionStorage.getItem('usuario');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            return null;
        }
    }

    static getToken() {
        const user = this.getUser();
        return user ? user.token : null;
    }

    static isAuthenticated() {
        const user = this.getUser();
        return !!(user && user.token && user.login && user.conta);
    }

    static logout() {
        // Fazer logout no servidor para revogar o token
        const token = this.getToken();
        const conta = this.getUser()?.conta;
        
        if (token && conta) {
            fetch(`${CONFIG.API_BASE_URL}/api/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ conta })
            }).catch(() => {
                // Ignorar erros de logout, apenas limpar localmente
            });
        }
        
        // Limpar dados locais
        sessionStorage.removeItem('usuario');
        
        // Redirecionar para login
        if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
            window.location.href = '/';
        }
    }

    static async validateSession() {
        const user = this.getUser();
        
        if (!user || !user.token) {
            this.logout();
            return false;
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/validar-usuario`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    login: user.login,
                    conta: user.conta,
                    token: user.token
                })
            });

            const result = await response.json();

            if (!result.valid) {
                this.logout();
                return false;
            }
            
            // Verificar se a conta foi alterada ou o token foi renovado
            if (result.accountChanged || result.tokenRefreshed) {
                console.log('🔄 Atualizando sessão:', result.message);
                
                // Atualizar dados do usuário no sessionStorage
                const updatedUser = {
                    login: result.usuario.login,
                    conta: result.usuario.conta,
                    acesso: result.usuario.acesso,
                    token: result.token
                };
                
                sessionStorage.setItem('usuario', JSON.stringify(updatedUser));
                
                if (result.accountChanged) {
                    console.log(`✅ Conta atualizada: ${user.conta} → ${result.usuario.conta}`);
                    
                    // Se a conta mudou, pode ser necessário recarregar a página
                    // para refletir as novas permissões
                    if (user.conta !== result.usuario.conta) {
                        alert(`Sua conta foi atualizada para: ${result.usuario.conta}. A página será recarregada.`);
                        window.location.reload();
                        return false;
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('Erro na validação de sessão:', error);
            this.logout();
            return false;
        }
    }

    static getAuthHeaders() {
        const token = this.getToken();
        if (!token) {
            throw new Error('Token não encontrado');
        }

        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    static async makeAuthenticatedRequest(url, options = {}) {
        try {
            const headers = this.getAuthHeaders();
            
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...(options.headers || {})
                }
            });

            // Se receber 401, token expirou
            if (response.status === 401) {
                this.logout();
                throw new Error('Sessão expirada');
            }

            return response;
        } catch (error) {
            if (error.message === 'Token não encontrado' || error.message === 'Sessão expirada') {
                this.logout();
            }
            throw error;
        }
    }

    // Método para uso com jQuery AJAX
    static getAjaxConfig(ajaxOptions = {}) {
        const token = this.getToken();
        if (!token) {
            this.logout();
            throw new Error('Token não encontrado');
        }

        return {
            ...ajaxOptions,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...(ajaxOptions.headers || {})
            },
            error: (xhr, status, error) => {
                if (xhr.status === 401) {
                    this.logout();
                }
                if (ajaxOptions.error) {
                    ajaxOptions.error(xhr, status, error);
                }
            }
        };
    }

    // Verificar se usuário é admin (apenas conta 1)
    static isAdmin() {
        const user = this.getUser();
        return user && user.conta === 1;
    }

    // Garantir que apenas admin acesse certas funcionalidades
    static requireAdmin() {
        if (!this.isAdmin()) {
            alert('Acesso negado. Apenas administradores podem acessar esta função.');
            if (this.getUser()) {
                window.location.href = '/pages/carteira';
            } else {
                this.logout();
            }
            return false;
        }
        return true;
    }
}

// Verificar autenticação em todas as páginas protegidas
function checkAuthOnLoad() {
    // Não verificar na página de login
    if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
        return;
    }

    // Verificar se está autenticado
    if (!AuthManager.isAuthenticated()) {
        AuthManager.logout();
        return;
    }

    // Validar sessão no servidor (assíncrono)
    AuthManager.validateSession().then(isValid => {
        if (!isValid) {
            alert('Sua sessão expirou. Faça login novamente.');
        }
    });
}

// Executar verificação ao carregar a página
document.addEventListener('DOMContentLoaded', checkAuthOnLoad);

// ===== UTILITÁRIOS GLOBAIS =====

// Função para fazer requisições autenticadas facilmente
async function fetchWithAuth(url, options = {}) {
    return AuthManager.makeAuthenticatedRequest(url, options);
}

// Função para jQuery AJAX com autenticação
function ajaxWithAuth(options) {
    return $.ajax(AuthManager.getAjaxConfig(options));
}

// Função para verificar se o usuário pode acessar funções administrativas
function requireAdminAccess() {
    return AuthManager.requireAdmin();
}