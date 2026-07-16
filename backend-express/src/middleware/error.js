export default function errorHandler(err, req, res, next) {
  console.error(err.stack);

  let status = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.code === 'P2002') {
    status = 409;
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'the selected fields';
    message = `Duplicate data is not allowed for ${target}. Please change the duplicated value or date range.`;
  } else if (err.code === 'P2003') {
    status = 400;
    message = 'This record is linked to missing or invalid related data. Please refresh and try again.';
  } else if (err.code === 'P2025') {
    status = 404;
    message = 'The record was not found. It may have been deleted already.';
  } else if (/cached plan must not change result type/i.test(message)) {
    status = 503;
    message = 'The database schema was just updated. Please refresh the page and try again.';
  } else if (/numeric field overflow/i.test(message)) {
    status = 400;
    message = 'One of the numbers is too large for the database field. Please check the entered price or markup.';
  } else if (status === 500 && process.env.NODE_ENV === 'production') {
    message = 'Something went wrong while saving. Please check the data and try again.';
  }

  res.status(status).json({
    code: status,
    message: message
  });
}
