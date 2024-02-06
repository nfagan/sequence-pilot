im_ps = shared_utils.io.find( '~/repositories/changlab/ilker_collab/sequence-pilot/dist/img_goldenberg', '.jpg' );
ims = cellfun( @imread, im_ps, 'un', 0 );

big_ims = cellfun( @(x) imresize(x, 1.5), ims, 'un', 0 );
for i = 1:numel(big_ims)
  dst_p = fullfile( fileparts(fileparts(im_ps{i})), 'img_goldenberg_big' ...
    , shared_utils.io.filenames(im_ps{i}, true) );
  shared_utils.io.require_dir( fileparts(dst_p) );
  imwrite( big_ims{i}, dst_p );
end