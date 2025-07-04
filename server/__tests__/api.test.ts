import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../routes';
import { storage } from '../storage';

// Mock storage
jest.mock('../storage', () => ({
  storage: {
    getAllClients: jest.fn(),
    createClient: jest.fn(),
    updateClient: jest.fn(),
    deleteClient: jest.fn(),
    getClient: jest.fn(),
    getAllCases: jest.fn(),
    createCase: jest.fn(),
    updateCase: jest.fn(),
    deleteCase: jest.fn(),
    getCase: jest.fn(),
    getAllSessions: jest.fn(),
    createSession: jest.fn(),
    updateSession: jest.fn(),
    deleteSession: jest.fn(),
    getAllDocuments: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    deleteDocument: jest.fn(),
    getAllTasks: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    getAllInvoices: jest.fn(),
    createInvoice: jest.fn(),
    updateInvoice: jest.fn(),
    deleteInvoice: jest.fn(),
    logActivity: jest.fn(),
  }
}));

// Mock authentication middleware
jest.mock('../auth', () => ({
  setupAuth: jest.fn((app: express.Express) => {
    app.use((req: any, res: any, next: any) => {
      req.isAuthenticated = () => true;
      req.user = { id: 1, username: 'admin', role: 'admin' };
      next();
    });
  })
}));

const app = express();
app.use(express.json());
registerRoutes(app);

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Clients API', () => {
    test('GET /api/clients should return all clients', async () => {
      const mockClients = [
        { id: 1, name: 'Test Client', phone: '123456789' }
      ];
      (storage.getAllClients as jest.Mock).mockResolvedValue(mockClients);

      const response = await request(app)
        .get('/api/clients')
        .expect(200);

      expect(response.body).toEqual(mockClients);
      expect(storage.getAllClients).toHaveBeenCalled();
    });

    test('POST /api/clients should create a new client', async () => {
      const clientData = { name: 'New Client', phone: '123456789' };
      const createdClient = { id: 1, ...clientData };
      (storage.createClient as jest.Mock).mockResolvedValue(createdClient);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/clients')
        .send(clientData)
        .expect(201);

      expect(response.body).toEqual(createdClient);
      expect(storage.createClient).toHaveBeenCalledWith({
        ...clientData,
        createdBy: 1
      });
    });

    test('PUT /api/clients/:id should update a client', async () => {
      const clientId = 1;
      const updateData = { name: 'Updated Client' };
      const updatedClient = { id: clientId, ...updateData };
      (storage.updateClient as jest.Mock).mockResolvedValue(updatedClient);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .put(`/api/clients/${clientId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(updatedClient);
      expect(storage.updateClient).toHaveBeenCalledWith(clientId, updateData);
    });

    test('DELETE /api/clients/:id should delete a client', async () => {
      const clientId = 1;
      (storage.deleteClient as jest.Mock).mockResolvedValue(undefined);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      await request(app)
        .delete(`/api/clients/${clientId}`)
        .expect(204);

      expect(storage.deleteClient).toHaveBeenCalledWith(clientId);
    });
  });

  describe('Cases API', () => {
    test('GET /api/cases should return all cases', async () => {
      const mockCases = [
        { id: 1, title: 'Test Case', type: 'civil' }
      ];
      (storage.getCasesForUser as jest.Mock).mockResolvedValue(mockCases);

      const response = await request(app)
        .get('/api/cases')
        .expect(200);

      expect(response.body).toEqual(mockCases);
    });

    test('POST /api/cases should create a new case', async () => {
      const caseData = { title: 'New Case', type: 'civil', clientId: 1 };
      const createdCase = { id: 1, ...caseData };
      (storage.createCase as jest.Mock).mockResolvedValue(createdCase);
      (storage.assignUserToCase as jest.Mock).mockResolvedValue(undefined);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/cases')
        .send(caseData)
        .expect(201);

      expect(response.body).toEqual(createdCase);
    });

    test('PUT /api/cases/:id should update a case', async () => {
      const caseId = 1;
      const updateData = { title: 'Updated Case' };
      const updatedCase = { id: caseId, ...updateData };
      (storage.updateCase as jest.Mock).mockResolvedValue(updatedCase);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .put(`/api/cases/${caseId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(updatedCase);
    });
  });

  describe('Sessions API', () => {
    test('GET /api/sessions should return all sessions', async () => {
      const mockSessions = [
        { id: 1, title: 'Test Session', date: '2025-01-01' }
      ];
      (storage.getAllSessions as jest.Mock).mockResolvedValue(mockSessions);

      const response = await request(app)
        .get('/api/sessions')
        .expect(200);

      expect(response.body).toEqual(mockSessions);
    });

    test('POST /api/sessions should create a new session', async () => {
      const sessionData = { title: 'New Session', date: '2025-01-01', time: '10:00', caseId: 1 };
      const createdSession = { id: 1, ...sessionData };
      (storage.checkSessionConflict as jest.Mock).mockResolvedValue(false);
      (storage.createSession as jest.Mock).mockResolvedValue(createdSession);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/sessions')
        .send(sessionData)
        .expect(201);

      expect(response.body).toEqual(createdSession);
    });

    test('PUT /api/sessions/:id should update a session', async () => {
      const sessionId = 1;
      const updateData = { title: 'Updated Session' };
      const updatedSession = { id: sessionId, ...updateData };
      (storage.updateSession as jest.Mock).mockResolvedValue(updatedSession);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .put(`/api/sessions/${sessionId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(updatedSession);
    });

    test('DELETE /api/sessions/:id should delete a session', async () => {
      const sessionId = 1;
      (storage.deleteSession as jest.Mock).mockResolvedValue(undefined);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .expect(204);

      expect(storage.deleteSession).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('Documents API', () => {
    test('GET /api/documents should return all documents', async () => {
      const mockDocuments = [
        { id: 1, title: 'Test Document', filePath: 'test.pdf' }
      ];
      (storage.getAllDocuments as jest.Mock).mockResolvedValue(mockDocuments);

      const response = await request(app)
        .get('/api/documents')
        .expect(200);

      expect(response.body).toEqual(mockDocuments);
    });

    test('PUT /api/documents/:id should update a document', async () => {
      const documentId = 1;
      const updateData = { title: 'Updated Document' };
      const updatedDocument = { id: documentId, ...updateData };
      (storage.updateDocument as jest.Mock).mockResolvedValue(updatedDocument);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .put(`/api/documents/${documentId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(updatedDocument);
    });

    test('DELETE /api/documents/:id should delete a document', async () => {
      const documentId = 1;
      (storage.deleteDocument as jest.Mock).mockResolvedValue(undefined);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      await request(app)
        .delete(`/api/documents/${documentId}`)
        .expect(204);

      expect(storage.deleteDocument).toHaveBeenCalledWith(documentId);
    });
  });

  describe('Tasks API', () => {
    test('GET /api/tasks should return all tasks', async () => {
      const mockTasks = [
        { id: 1, title: 'Test Task', description: 'Test description' }
      ];
      (storage.getAllTasks as jest.Mock).mockResolvedValue(mockTasks);

      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(response.body).toEqual(mockTasks);
    });

    test('POST /api/tasks should create a new task', async () => {
      const taskData = { title: 'New Task', description: 'New description' };
      const createdTask = { id: 1, ...taskData };
      (storage.createTask as jest.Mock).mockResolvedValue(createdTask);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body).toEqual(createdTask);
    });

    test('PUT /api/tasks/:id should update a task', async () => {
      const taskId = 1;
      const updateData = { title: 'Updated Task' };
      const updatedTask = { id: taskId, ...updateData };
      (storage.updateTask as jest.Mock).mockResolvedValue(updatedTask);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(updatedTask);
    });

    test('DELETE /api/tasks/:id should delete a task', async () => {
      const taskId = 1;
      (storage.deleteTask as jest.Mock).mockResolvedValue(undefined);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      await request(app)
        .delete(`/api/tasks/${taskId}`)
        .expect(204);

      expect(storage.deleteTask).toHaveBeenCalledWith(taskId);
    });
  });

  describe('Invoices API', () => {
    test('GET /api/invoices should return all invoices', async () => {
      const mockInvoices = [
        { id: 1, amount: '100.00', description: 'Test Invoice' }
      ];
      (storage.getAllInvoices as jest.Mock).mockResolvedValue(mockInvoices);

      const response = await request(app)
        .get('/api/invoices')
        .expect(200);

      expect(response.body).toEqual(mockInvoices);
    });

    test('POST /api/invoices should create a new invoice', async () => {
      const invoiceData = { amount: '200.00', description: 'New Invoice' };
      const createdInvoice = { id: 1, ...invoiceData };
      (storage.createInvoice as jest.Mock).mockResolvedValue(createdInvoice);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/invoices')
        .send(invoiceData)
        .expect(201);

      expect(response.body).toEqual(createdInvoice);
    });

    test('PUT /api/invoices/:id should update an invoice', async () => {
      const invoiceId = 1;
      const updateData = { amount: '300.00' };
      const updatedInvoice = { id: invoiceId, ...updateData };
      (storage.updateInvoice as jest.Mock).mockResolvedValue(updatedInvoice);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .put(`/api/invoices/${invoiceId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(updatedInvoice);
    });

    test('DELETE /api/invoices/:id should delete an invoice', async () => {
      const invoiceId = 1;
      (storage.deleteInvoice as jest.Mock).mockResolvedValue(undefined);
      (storage.logActivity as jest.Mock).mockResolvedValue({});

      await request(app)
        .delete(`/api/invoices/${invoiceId}`)
        .expect(204);

      expect(storage.deleteInvoice).toHaveBeenCalledWith(invoiceId);
    });
  });
}); 