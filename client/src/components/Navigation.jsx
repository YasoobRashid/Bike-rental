import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navigation() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    }

    return (
        <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
            <Container>
                <Navbar.Brand href="#">BikeRental System</Navbar.Brand>
                <Nav className="ms-auto">
                    {user && (
                        <div className="d-flex align-items-center gap-3">
                            <span className="text-white">
                                Welcome, <strong>{user.username}</strong> ({user.role})
                            </span>
                            <Button variant="danger" size="sm" onClick={handleLogout}>
                                Logout
                            </Button>
                        </div>
                    )}
                </Nav>
            </Container>
        </Navbar>
    );
}