export const basicAuth = (req, res, next) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  const expectedUsername = process.env.STAFF_USERNAME || 'admin';
  const expectedPassword = process.env.STAFF_PASSWORD || 'admin';

  if (login && password && login === expectedUsername && password === expectedPassword) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="401"');
  res.status(401).send('Authentication required.');
};
