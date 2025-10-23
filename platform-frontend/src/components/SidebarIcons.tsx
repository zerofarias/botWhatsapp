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
  FaRobot,
} from 'react-icons/fa';

export const sidebarIcons: Record<string, JSX.Element> = {
  Estado: <FaHome />,
  Chat: <FaComments />,
  Flujos: <FaProjectDiagram />,
  'Flow Builder': <FaSitemap />,
  Bots: <FaRobot />,
  Usuarios: <FaUsers />,
  Areas: <FaSitemap />,
  Contactos: <FaAddressBook />,
  Horarios: <FaClock />,
  Configuracion: <FaCogs />,
};
