const API_URL = 'http://localhost:5000/api';

const api = {
    request: async (endpoint, options = {}) => {
        const token = localStorage.getItem('hub_session');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.msg || 'Something went wrong');
        }

        return data;
    },

    auth: {
        login: async (credentials) => {
            const data = await api.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            localStorage.setItem('hub_session', data.token);
            localStorage.setItem('hub_user', JSON.stringify(data.user));
            return data.user;
        },
        register: async (userData) => {
            const data = await api.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            return data;
        },
        logout: () => {
            localStorage.removeItem('hub_session');
            localStorage.removeItem('hub_user');
            window.location.href = 'login.html';
        }
    },

    user: {
        getServices: async (category = '', location = '') => {
            return await api.request(`/services?category=${encodeURIComponent(category)}&location=${encodeURIComponent(location)}`);
        },
        bookService: async (bookingData) => {
            return await api.request('/user/bookings', {
                method: 'POST',
                body: JSON.stringify(bookingData)
            });
        },
        getMyBookings: async () => {
            return await api.request('/user/bookings');
        },
        getComplaints: async () => {
            return await api.request('/user/complaints');
        },
        fileComplaint: async (complaintData) => {
            return await api.request('/user/complaints', {
                method: 'POST',
                body: JSON.stringify(complaintData)
            });
        },
        submitReview: async (reviewData) => {
            return await api.request('/user/reviews', {
                method: 'POST',
                body: JSON.stringify(reviewData)
            });
        }
    },

    admin: {
        getStats: async () => {
            return await api.request('/admin/stats');
        },
        getAllUsers: async () => {
            return await api.request('/admin/users');
        },
        getAllWorkers: async () => {
            return await api.request('/admin/workers');
        },
        getCategories: async () => {
            return await api.request('/admin/categories');
        },
        addCategory: async (cat) => {
            return await api.request('/admin/categories', {
                method: 'POST',
                body: JSON.stringify(cat)
            });
        },
        getAllComplaints: async () => {
            return await api.request('/admin/complaints');
        },
        getAllApplications: async () => {
            return await api.request('/admin/applications');
        },
        updateApplicationStatus: async (id, status) => {
            return await api.request(`/admin/providers/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
        }
    },

    servicer: {
        getProfile: async () => {
            return await api.request('/servicer/profile');
        },
        updateProfile: async (profileData) => {
            return await api.request('/servicer/profile', {
                method: 'POST',
                body: JSON.stringify(profileData)
            });
        },
        getAppointments: async () => {
            return await api.request('/servicer/appointments');
        },
        getComplaints: async () => {
            return await api.request('/servicer/complaints');
        },
        updateAppointmentStatus: async (appointmentId, status) => {
            return await api.request(`/servicer/appointments/${appointmentId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
        },
        getReviews: async () => {
            return await api.request('/servicer/reviews');
        }
    }
};

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('hub_user'));
    if (!user && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html') && !window.location.pathname.includes('index.html')) {
        window.location.href = 'login.html';
    }
    return user;
}
