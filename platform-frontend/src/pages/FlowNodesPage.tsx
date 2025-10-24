import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Node {
  id: number;
  name: string;
  type: string;
  content: string;
  order_index: number;
  is_active: number;
}

interface Props {
  flowId: number;
}

const FlowNodesPage: React.FC<Props> = ({ flowId }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'message',
    content: '',
    order_index: 0,
    is_active: 1,
  });

  useEffect(() => {
    setLoading(true);
    axios
      .get(`http://localhost:4000/api/flows/${flowId}/nodes`)
      .then((res) => setNodes(res.data))
      .catch(() => setError('Error al cargar nodos'))
      .finally(() => setLoading(false));
  }, [flowId]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`http://localhost:4000/api/flows/${flowId}/nodes`, form);
      setForm({
        name: '',
        type: 'message',
        content: '',
        order_index: 0,
        is_active: 1,
      });
      // Recargar nodos
      const res = await axios.get(
        `http://localhost:4000/api/flows/${flowId}/nodes`
      );
      setNodes(res.data);
    } catch {
      setError('Error al crear nodo');
    }
  };

  return (
    <div>
      <h2>Nodos del flujo</h2>
      {loading ? <p>Cargando...</p> : null}
      {error ? <p style={{ color: 'red' }}>{error}</p> : null}
      <ul>
        {nodes.map((node) => (
          <li key={node.id}>
            <strong>{node.name}</strong> ({node.type}) - {node.content}
          </li>
        ))}
      </ul>
      <h3>Crear nuevo nodo</h3>
      <form onSubmit={handleSubmit} style={{ marginTop: '1em' }}>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Nombre"
          required
        />
        <select name="type" value={form.type} onChange={handleChange}>
          <option value="message">Mensaje</option>
          <option value="menu">Menú</option>
          <option value="action">Acción</option>
          <option value="redirect">Redirección</option>
          <option value="end">Fin</option>
        </select>
        <textarea
          name="content"
          value={form.content}
          onChange={handleChange}
          placeholder="Contenido"
        />
        <input
          name="order_index"
          type="number"
          value={form.order_index}
          onChange={handleChange}
          min={0}
        />
        <select name="is_active" value={form.is_active} onChange={handleChange}>
          <option value={1}>Activo</option>
          <option value={0}>Inactivo</option>
        </select>
        <button type="submit">Crear nodo</button>
      </form>
    </div>
  );
};

export default FlowNodesPage;
