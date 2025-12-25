import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import ChatWindow from '../components/ChatWindow';
import Navigation from '../components/Navigation';
import { Container, Row, Col, Card, Button, Badge, Form, Alert } from 'react-bootstrap';

export default function RenterDashboard() {
    const { API_URL, user } = useContext(AuthContext);
    const [availableBikes, setAvailableBikes] = useState([]);
    const [myRentals, setMyRentals] = useState([]);
    const [chatBikeId, setChatBikeId] = useState(null);
    const [licenseFile, setLicenseFile] = useState(null);
    const [msg, setMsg] = useState(null);

    useEffect(() => { fetchBikes(); }, []);

    const fetchBikes = async () => {
        try {
            const res = await axios.get(`${API_URL}/bikes`);
            setAvailableBikes(res.data.availableBikes);
            setMyRentals(res.data.rentedByMe);
        } catch (error) { console.error(error); }
    };

    const handleUploadLicense = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('license', licenseFile);

        try {
            const res = await axios.post(`${API_URL}/auth/verify-license`, formData);
            
            if (res.data.status === 'verified') {
                setMsg({ type: 'success', text: 'License Uploaded! You are now verified.' });
            } else {
                setMsg({ type: 'warning', text: 'Upload Successful, but could not verify ID automatically. Sent for manual review.' });
            }
            
        } catch (err) {
            setMsg({ type: 'danger', text: 'Verification Failed: ' + (err.response?.data?.error || err.message) });
        }
    };

    const handleRent = async (bikeId) => {
        try {
            await axios.post(`${API_URL}/bikes/rent`, { bikeId });
            alert("Bike Rented Successfully!");
            fetchBikes();
        } catch (err) { 
            // If backend says Identity not verified
            if (err.response?.status === 403) {
                setMsg({ type: 'warning', text: 'You must upload your license (above) before renting.' });
                window.scrollTo(0,0);
            } else {
                alert(err.response?.data?.error); 
            }
        }
    };

    const handleReturn = async (bikeId) => {
        try {
            await axios.post(`${API_URL}/bikes/return`, { bikeId });
            alert("Bike Returned Successfully!");
            fetchBikes();
        } catch (err) { alert(err.response?.data?.error); }
    };

    return (
        <>
            <Navigation />
            <Container className="pb-5">
                {msg && <Alert variant={msg.type} onClose={() => setMsg(null)} dismissible>{msg.text}</Alert>}

                {/* --- IDENTITY VERIFICATION SECTION --- */}
                {/* Note: In a real app, we would check user.isVerified from context, but for now we show this if they need it */}
                <Card className="mb-4 border-info shadow-sm">
                    <Card.Body>
                        <Card.Title>Identity Verification</Card.Title>
                        <Card.Text className="text-muted small">
                            Before renting, you must upload a Driver's License. 
                            (The system will check if your username matches the name on the ID).
                        </Card.Text>
                        <Form onSubmit={handleUploadLicense} className="d-flex gap-3 align-items-center">
                            <Form.Control type="file" onChange={e => setLicenseFile(e.target.files[0])} required />
                            <Button variant="info" type="submit" className="text-white">Upload License</Button>
                        </Form>
                    </Card.Body>
                </Card>

                {/* --- MY RENTALS --- */}
                {myRentals.length > 0 && (
                    <div className="mb-5">
                        <h4 className="mb-3">My Active Rentals</h4>
                        <Row xs={1} md={2} className="g-4">
                            {myRentals.map(bike => (
                                <Col key={bike._id}>
                                    <Card border="primary" className="shadow-sm">
                                        <Card.Body className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h5 className="mb-1">{bike.name}</h5>
                                                <small className="text-muted">${bike.pricePerHour}/hr</small>
                                            </div>
                                            <div className="d-flex gap-2">
                                                <Button variant="primary" size="sm" onClick={() => setChatBikeId(bike._id)}>Chat</Button>
                                                <Button variant="dark" size="sm" onClick={() => handleReturn(bike._id)}>Return</Button>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </div>
                )}

                {/* --- AVAILABLE BIKES --- */}
                <h4 className="mb-3">Available for Rent</h4>
                {availableBikes.length === 0 ? <p className="text-muted">No bikes available right now.</p> : (
                    <Row xs={1} md={3} lg={4} className="g-4">
                        {availableBikes.map(bike => (
                            <Col key={bike._id}>
                                <Card className="h-100 shadow-sm border-0 bg-light">
                                    <div className="bg-secondary text-white d-flex align-items-center justify-content-center" style={{ height: '150px' }}>
                                        Bike Image
                                    </div>
                                    <Card.Body>
                                        <Card.Title>{bike.name}</Card.Title>
                                        <Card.Text>
                                            <Badge bg="success" className="me-2">Verified</Badge>
                                            <strong>${bike.pricePerHour}/hr</strong>
                                        </Card.Text>
                                        <Button variant="outline-primary" className="w-100" onClick={() => handleRent(bike._id)}>Rent Now</Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}

                {/* --- CHAT POPUP --- */}
                {chatBikeId && (
                    <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '320px', zIndex: 1000 }}>
                        <div className="position-relative">
                            <Button variant="danger" size="sm" className="position-absolute top-0 end-0 m-1" style={{ zIndex: 1001 }} onClick={() => setChatBikeId(null)}>X</Button>
                            <ChatWindow bikeId={chatBikeId} />
                        </div>
                    </div>
                )}
            </Container>
        </>
    );
}