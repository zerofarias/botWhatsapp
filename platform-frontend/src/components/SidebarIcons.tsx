import {
  FaComments,
  FaHome,
  FaProjectDiagram,
  FaUsers,
  FaCogs,
  FaUserShield,
  FaClock,
  FaAddressBook,
  FaSitemap,
} from 'react-icons/fa';

export const sidebarIcons: Record<string, JSX.Element> = {
  Estado: <FaHome />,
  Chat: <FaComments />,
  Flujos: <FaProjectDiagram />,
  'Flow Builder': <FaSitemap />,
  Usuarios: <FaUsers />,
  Areas: <FaSitemap />,
  Contactos: <FaAddressBook />,
  Horarios: <FaClock />,
  Configuracion: <FaCogs />,
};
