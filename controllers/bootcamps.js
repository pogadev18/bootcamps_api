const geocoder = require('../utils/geocoder');
const Bootcamp = require('../models/Bootcamp');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

/*
 - @desc    Get all bootcamps
 - @route   GET /api/v1/bootcamps
 - @access  Public
 */
exports.getBootcamps = asyncHandler(async (req, res) => {
  let query;

  // copy req.query
  const reqQuery = { ...req.query };

  // fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach(param => delete reqQuery[param]);

  // create query string
  let queryString = JSON.stringify(reqQuery);

  // create operators ($gt, $gte, etc)
  queryString = queryString.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${ match }`);

  // finding resource
  query = Bootcamp.find(JSON.parse(queryString)).populate('courses');

  // select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Bootcamp.countDocuments();

  query = query.skip(startIndex).limit(limit);

  // executing query
  const bootcamps = await query;

  // pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: bootcamps.length,
    pagination,
    data: bootcamps
  });
});

/*
 - @desc    Get single bootcamp
 - @route   GET /api/v1/bootcamps/:id
 - @access  Public
 */
exports.getBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(new ErrorResponse(`Bootcamp with id of ${ req.params.id } was not found`, 404));
  }

  res.status(200).json({
    success: true,
    data: bootcamp
  });
});

/*
 - @desc    Create new bootcamp
 - @route   POST /api/v1/bootcamps
 - @access  Private
 */
exports.createBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.create(req.body);
  res.status(201).json({
    success: true,
    data: bootcamp
  });
});

/*
 - @desc    Update bootcamp
 - @route   PUT /api/v1/bootcamps/:id
 - @access  Private
 */
exports.updateBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!bootcamp) {
    return next(new ErrorResponse(`Bootcamp with id of ${ req.params.id } was not found`, 404));
  }

  res.status(200).json({
    success: true,
    data: bootcamp
  });
});

/*
 - @desc    Delete bootcamp
 - @route   DELETE /api/v1/bootcamps/:id
 - @access  Private
 */
exports.deleteBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(new ErrorResponse(`Bootcamp with id of ${ req.params.id } was not found`, 404));
  }

  // trigger middleware to delete all courses of a specific bootcamp
  bootcamp.remove();

  res.status(200).json({
    success: true,
    data: { message: `Bootcamp with id ${ req.params.id } was deleted!` }
  });
});

/*
 - @desc    Get bootcamps within a radius
 - @route   GET /api/v1/bootcamps/radius/:zipcode/:distance
 - @access  Private
 */
exports.getBootcampsInRadius = asyncHandler(async (req, res) => {
  const { zipcode, distance } = req.params;

  // Get lat/lng from geocoder
  const location = await geocoder.geocode(zipcode);
  const lat = location[0].latitude;
  const lng = location[0].longitude;

  // Calculate radius using radians (divide distance by radius of Earth)
  // Earth Radius = 3,963 mi / 6,378 km
  const radius = distance / 6378;

  const bootcamps = await Bootcamp.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    success: true,
    count: bootcamps.length,
    data: bootcamps
  });
});
