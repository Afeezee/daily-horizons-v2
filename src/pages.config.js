import About from './pages/About';
import Author from './pages/Author';
import Category from './pages/Category';
import DailyDigest from './pages/DailyDigest';
import Home from './pages/Home';
import PublisherDashboard from './pages/PublisherDashboard';
import Search from './pages/Search';
import MyAccount from './pages/MyAccount';
import Article from './pages/Article';
import AdminDashboard from './pages/AdminDashboard';
import __Layout from './Layout.jsx';

export const PAGES = {
  About,
  Author,
  Category,
  DailyDigest,
  Home,
  PublisherDashboard,
  Search,
  MyAccount,
  Article,
  AdminDashboard,
};

export const pagesConfig = {
  mainPage: 'Home',
  Pages: PAGES,
  Layout: __Layout,
};
