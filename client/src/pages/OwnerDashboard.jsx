import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import ChatWindow from '../components/ChatWindow';
import Navigation from '../components/Navigation';
import { Container, Row, Col, Card, Form, Button, Badge, Alert } from 'react-bootstrap';

export default function OwnerDashboard() {
    const { API_URL } = useContext(AuthContext);
    const [bikes, setBikes] = useState([]);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [number, setNumber] = useState('');
    const [file, setFile] = useState(null);
    const [pendingBikeId, setPendingBikeId] = useState(null);
    const [selectedBikeId, setSelectedBikeId] = useState(null);
    const [msg, setMsg] = useState({ type: '', text: '' });

    useEffect(() => { fetchBikes(); }, []);

    const fetchBikes = async () => {
        try {
            const res = await axios.get(`${API_URL}/bikes`);
            setBikes(res.data.bikes);
        } catch (error) { console.error(error); }
    };

    const handleAddBike = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/bikes`, { name, pricePerHour: price, bikeNumber: number });
            setPendingBikeId(res.data.bike._id);
            setMsg({ type: 'success', text: 'Bike Listed! Please upload document now.' });
        } catch (err) {
            setMsg({ type: 'danger', text: err.response?.data?.error || 'Error' });
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('bikeId', pendingBikeId);
        formData.append('document', file);
        try {
            const res = await axios.post(`${API_URL}/bikes/verify-ownership`, formData);
            setMsg({ type: 'success', text: res.data.message });
            setPendingBikeId(null);
            fetchBikes();
        } catch (err) {
            setMsg({ type: 'danger', text: 'Verification Failed: ' + (err.response?.data?.error || err.message) });
        }
    };

    const handleDelete = async (id) => {
        if(!confirm("Delete this bike?")) return;
        try {
            await axios.delete(`${API_URL}/bikes/${id}`);
            fetchBikes();
        } catch (err) { alert(err.response?.data?.error); }
    }

    return (
        <>
            <Navigation />
            <Container>
                {msg.text && <Alert variant={msg.type} onClose={() => setMsg({type:'', text:''})} dismissible>{msg.text}</Alert>}

                {/* --- ADD BIKE FORM --- */}
                <Card className="mb-4 border-0 shadow-sm">
                    <Card.Body>
                        <Card.Title>{pendingBikeId ? "Step 2: Upload Document" : "Step 1: Add New Bike"}</Card.Title>
                        {!pendingBikeId ? (
                            <Form onSubmit={handleAddBike}>
                                <Row>
                                    <Col md={4}><Form.Control placeholder="Bike Name" onChange={e => setName(e.target.value)} required className="mb-2" /></Col>
                                    <Col md={3}><Form.Control type="number" placeholder="Price/Hr" onChange={e => setPrice(e.target.value)} required className="mb-2" /></Col>
                                    <Col md={3}><Form.Control placeholder="Bike Number" onChange={e => setNumber(e.target.value)} required className="mb-2" /></Col>
                                    <Col md={2}><Button variant="success" type="submit" className="w-100">Next</Button></Col>
                                </Row>
                            </Form>
                        ) : (
                            <Form onSubmit={handleVerify} className="d-flex gap-3 align-items-center">
                                <Form.Control type="file" onChange={e => setFile(e.target.files[0])} required />
                                <Button variant="primary" type="submit">Verify</Button>
                                <Button variant="secondary" onClick={() => setPendingBikeId(null)}>Cancel</Button>
                            </Form>
                        )}
                    </Card.Body>
                </Card>

                {/* --- BIKE LIST --- */}
                <h4 className="mb-3">My Bikes</h4>
                <Row xs={1} md={2} lg={3} className="g-4">
                    {bikes.map(bike => (
                        <Col key={bike._id}>
                            <Card className="h-100 shadow-sm">
                                <Card.Body>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <Card.Title>{bike.name}</Card.Title>
                                        <Badge bg={bike.isVerified ? 'success' : 'warning'}>{bike.verificationStatus}</Badge>
                                    </div>
                                    <Card.Text className="text-muted">
                                        Plate: {bike.bikeNumber}<br/>
                                        Price: ${bike.pricePerHour}/hr
                                    </Card.Text>
                                    <div className="d-flex gap-2 mt-3">
                                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(bike._id)}>Delete</Button>
                                        {bike.rentedBy && (
                                            <Button variant="outline-primary" size="sm" onClick={() => setSelectedBikeId(bike._id)}>
                                                Chat with Renter
                                            </Button>
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* --- CHAT POPUP --- */}
                {selectedBikeId && (
                    <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '320px', zIndex: 1000 }}>
                        <div className="position-relative">
                            <Button 
                                variant="danger" 
                                size="sm" 
                                className="position-absolute top-0 end-0 m-1" 
                                style={{ zIndex: 1001 }}
                                onClick={() => setSelectedBikeId(null)}
                            >X</Button>
                            <ChatWindow bikeId={selectedBikeId} />
                        </div>
                    </div>
                )}
            </Container>
        </>
    );
}