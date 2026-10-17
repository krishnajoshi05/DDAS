const express = require('express');

const router = express.Router();

const FileRecord =
  require('../models/FileRecord');

const DuplicateAlert =
  require('../models/DuplicateAlert');

/* DASHBOARD STATS */

router.get('/stats', async(req,res)=>{

  try{

    const totalFiles =
      await FileRecord.countDocuments();

    const exactDuplicates =
      await FileRecord.countDocuments({
        isDuplicate:true,
        matchKind:'exact'
      });

    const nearDuplicates =
      await FileRecord.countDocuments({
        matchKind:'near'
      });

    const partialDuplicates =
      await FileRecord.countDocuments({
        matchKind:'partial'
      });

    const totalStorageAgg =
      await FileRecord.aggregate([

        {
          $group:{
            _id:null,
            total:{
              $sum:'$fileSize'
            }
          }
        }

      ]);

    const storageSavedAgg =
      await FileRecord.aggregate([

        {
          $match:{
            isDuplicate:true
          }
        },

        {
          $group:{
            _id:null,
            total:{
              $sum:'$fileSize'
            }
          }
        }

      ]);

    const recentAlerts =
      await DuplicateAlert
        .find()
        .sort({createdAt:-1})
        .limit(5);

    const fileTypes =
      await FileRecord.aggregate([

        {
          $group:{
            _id:'$fileType',
            count:{$sum:1}
          }
        }

      ]);

    const uploadsOverTime =
      await FileRecord.aggregate([

        {
          $group:{
            _id:{
              $dateToString:{
                format:'%Y-%m-%d',
                date:'$createdAt'
              }
            },
            uploads:{
              $sum:1
            }
          }
        },

        {
          $sort:{
            _id:1
          }
        }

      ]);

    res.json({

      totalFiles,

      exactDuplicates,

      nearDuplicates,

      partialDuplicates,

      totalStorage:
        totalStorageAgg[0]?.total || 0,

      storageSaved:
        storageSavedAgg[0]?.total || 0,

      duplicatePercentage:
        totalFiles
          ? Math.round(
              (
                exactDuplicates /
                totalFiles
              ) * 100
            )
          : 0,

      recentAlerts,

      fileTypes,

      uploadsOverTime

    });

  }catch(err){

    console.error(err);

    res.status(500).json({
      message:'Dashboard error'
    });

  }

});

module.exports = router;