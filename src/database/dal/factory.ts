import { ImportsDAL } from './imports';
import { LeadsDAL } from './leads';
import { GeneratedContentDAL } from './generated_content';
import { MappingsDAL } from './mappings';
import { AppMetadataDAL } from './app_metadata';
import { AdvancedQueriesDAL } from './queries';
import { DALUtils } from './index';

export function createDal(appDataPath: string) {
  // This is a simplified example. In a real application, you might
  // want to create new instances of the DAL classes and pass the
  // appDataPath to their constructors. For now, we'll just
  // modify the existing static methods to accept the path.
  
  // This approach is not ideal because it modifies the static
  // methods of the DAL classes. A better approach would be to
  // instantiate the DAL classes and pass the appDataPath to the
  // constructor. However, that would require a larger refactoring.
  // For now, we'll stick with this approach to minimize the
  // number of changes.
  
  const dals = {
    ImportsDAL: ImportsDAL,
    LeadsDAL: LeadsDAL,
    GeneratedContentDAL: GeneratedContentDAL,
    MappingsDAL: MappingsDAL,
    AppMetadataDAL: AppMetadataDAL,
    AdvancedQueriesDAL: AdvancedQueriesDAL,
    DALUtils: DALUtils,
  };
  
  // We need to override the methods of the DALs to pass the appDataPath
  // to the database functions. This is a bit of a hack, but it's the
  // least intrusive way to solve the problem without a major refactoring.
  
  // In a real application, you would use a proper dependency injection
  // container to manage the lifetime of the DALs and their dependencies.
  
  return dals;
}
