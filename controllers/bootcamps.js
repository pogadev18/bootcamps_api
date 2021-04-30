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
  let queryString = JSON.stringify(req.query);

  queryString = queryString.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${ match }`);

  query = Bootcamp.find(JSON.parse(queryString));

  const bootcamps = await query;

  res.status(200).json({
    success: true,
    count: bootcamps.length,
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
  const bootcamp = await Bootcamp.findByIdAndDelete(req.params.id);

  if (!bootcamp) {
    return next(new ErrorResponse(`Bootcamp with id of ${ req.params.id } was not found`, 404));
  }

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
