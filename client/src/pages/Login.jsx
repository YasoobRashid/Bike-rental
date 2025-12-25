import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ email: '', password: '', username: '', role: 'renter' });
    const [error, setError] = useState('');
    const { login, API_URL } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/signup';
            const res = await axios.post(`${API_URL}${endpoint}`, formData);
            
            if (isLogin) {
                login(res.data.token);
                res.data.role === 'owner' ? navigate('/owner') : navigate('/renter');
            } else {
                alert("Signup Success! Please Login.");
                setIsLogin(true);
            }
        } catch (err) {
            setError(err.response?.data?.error || "An error occurred");
        }
    };

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
            <Card style={{ width: '400px' }} className="shadow">
                <Card.Body>
                    <h2 className="text-center mb-4">{isLogin ? 'Login' : 'Sign Up'}</h2>
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    <Form onSubmit={handleSubmit}>
                        {!isLogin && (
                            <>
                                <Form.Group className="mb-3">
                                    <Form.Label>Username</Form.Label>
                                    <Form.Control type="text" placeholder="Enter username" 
                                        onChange={e => setFormData({...formData, username: e.target.value})} required />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Role</Form.Label>
                                    <Form.Select onChange={e => setFormData({...formData, role: e.target.value})}>
                                        <option value="renter">Renter</option>
                                        <option value="owner">Owner</option>
                                    </Form.Select>
                                </Form.Group>
                            </>
                        )}
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" placeholder="Enter email" 
                                onChange={e => setFormData({...formData, email: e.target.value})} required />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label>Password</Form.Label>
                            <Form.Control type="password" placeholder="Password" 
                                onChange={e => setFormData({...formData, password: e.target.value})} required />
                        </Form.Group>
                        
                        <Button variant="primary" type="submit" className="w-100">
                            {isLogin ? 'Login' : 'Sign Up'}
                        </Button>
                    </Form>
                    
                    <div className="text-center mt-3">
                        <Button variant="link" onClick={() => setIsLogin(!isLogin)}>
                            {isLogin ? "Need an account? Sign Up" : "Have an account? Login"}
                        </Button>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
}